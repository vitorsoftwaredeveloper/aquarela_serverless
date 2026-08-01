import { db } from "../../libs/mongo";
import { MensalidadeRepository } from "../../repositories/mensalidade.repository";
import { CriancaRepository } from "../../repositories/crianca.repository";
import { DispositivoRepository } from "../../repositories/dispositivo.repository";
import { enviarNotificacao } from "../notificacoes/enviarNotificacao";
import { hojeMeiaNoiteBrasil, inicioMesBrasil } from "../../utils/date";
import { GatilhoCobranca, IMensalidade } from "../../types/mensalidades";
import { ICrianca } from "../../types/criancas";
import { IDispositivo } from "../../types/dispositivos";

export interface IResultadoDisparoCobrancas {
  dryRun: boolean;
  responsaveisNotificados: number;
  responsaveisSemToken: number;
  mensalidadesAtualizadas: number;
}

interface ItemCobranca {
  criancaNome: string;
  mes: number;
  ano: number;
}

function corpoNotificacao(itens: ItemCobranca[]): string {
  if (itens.length === 1) {
    const [item] = itens;
    return `A mensalidade de ${item.criancaNome} (${item.mes}/${item.ano}) está em aberto.`;
  }
  return `Você tem ${itens.length} mensalidades em aberto.`;
}

/**
 * Único serviço por trás do cron dos dias 05/20 (COB-01) e do disparo manual
 * do admin (COB-04) — só muda `gatilho` e `dryRun`. Junta as mensalidades
 * cobráveis, agrupa por responsável (1 push por pessoa, não por mensalidade —
 * COB-02) e grava o histórico de idempotência em `mensalidades.cobrancas[]`
 * (COB-03).
 */
export const dispararCobrancasService = async (
  gatilho: GatilhoCobranca,
  dryRun: boolean,
): Promise<IResultadoDisparoCobrancas> => {
  await db();

  const hoje = hojeMeiaNoiteBrasil();
  const fimMesCorrente = inicioMesBrasil(
    hoje.getUTCFullYear(),
    hoje.getUTCMonth() + 2,
  );

  // O sistema pré-gera as 12 competências do ano (`gerarMensalidadesAno`) —
  // filtrar só por `status` cobraria dezembro em fevereiro. `vencimento`
  // limita ao mês corrente pra dentro.
  const candidatas = (await MensalidadeRepository.find({
    status: { $in: ["aberto", "atrasado"] },
    vencimento: { $lt: fimMesCorrente },
  })) as IMensalidade[];

  // Idempotência: mesmo gatilho já disparado hoje não redispara.
  const pendentes = candidatas.filter(
    (mensalidade) =>
      !(mensalidade.cobrancas ?? []).some(
        (cobranca) =>
          cobranca.gatilho === gatilho &&
          new Date(cobranca.enviadaEm) >= hoje,
      ),
  );

  if (pendentes.length === 0) {
    return {
      dryRun,
      responsaveisNotificados: 0,
      responsaveisSemToken: 0,
      mensalidadesAtualizadas: 0,
    };
  }

  const criancaIds = [
    ...new Set(pendentes.map((mensalidade) => String(mensalidade.criancaId))),
  ];
  const criancas = (await CriancaRepository.find(
    { _id: { $in: criancaIds } },
    { nome: 1, responsaveis: 1 },
  )) as ICrianca[];
  const criancaById = new Map(
    criancas.map((crianca) => [String(crianca._id), crianca]),
  );

  // `usuarioId` é ObjectId em runtime (schema de `criancas`/`dispositivos`) —
  // toda chave de Map/Set abaixo usa `String(...)` explícito, diferente do
  // padrão usado em filtro de query Mongo (que faz cast automático).
  const porResponsavel = new Map<string, ItemCobranca[]>();
  for (const mensalidade of pendentes) {
    const crianca = criancaById.get(String(mensalidade.criancaId));
    if (!crianca) continue;
    const usuarioIds = (crianca.responsaveis ?? [])
      .map((responsavel) => responsavel.usuarioId)
      .filter((usuarioId): usuarioId is string => Boolean(usuarioId))
      .map((usuarioId) => String(usuarioId));

    for (const usuarioId of usuarioIds) {
      const itens = porResponsavel.get(usuarioId) ?? [];
      itens.push({
        criancaNome: crianca.nome,
        mes: mensalidade.mes,
        ano: mensalidade.ano,
      });
      porResponsavel.set(usuarioId, itens);
    }
  }

  const usuarioIds = [...porResponsavel.keys()];
  const dispositivos = usuarioIds.length
    ? ((await DispositivoRepository.find({
        usuarioId: { $in: usuarioIds },
      })) as IDispositivo[])
    : [];
  const comToken = new Set(
    dispositivos.map((dispositivo) => String(dispositivo.usuarioId)),
  );
  const semToken = usuarioIds.filter((usuarioId) => !comToken.has(usuarioId));

  if (dryRun) {
    return {
      dryRun: true,
      responsaveisNotificados: usuarioIds.length - semToken.length,
      responsaveisSemToken: semToken.length,
      mensalidadesAtualizadas: 0,
    };
  }

  await Promise.all(
    usuarioIds.map((usuarioId) =>
      enviarNotificacao([usuarioId], {
        titulo: "Aquarela Kids",
        corpo: corpoNotificacao(porResponsavel.get(usuarioId)!),
        dados: { tipo: "cobranca", url: "/financeiro" },
      }),
    ),
  );

  const agora = new Date();
  await MensalidadeRepository.model.bulkWrite(
    pendentes.map((mensalidade) => ({
      updateOne: {
        filter: { _id: mensalidade._id },
        update: {
          $push: {
            cobrancas: {
              $each: [{ enviadaEm: agora, canal: "push", gatilho }],
              $slice: -12,
            },
          },
        },
      },
    })),
  );

  return {
    dryRun: false,
    responsaveisNotificados: usuarioIds.length - semToken.length,
    responsaveisSemToken: semToken.length,
    mensalidadesAtualizadas: pendentes.length,
  };
};
