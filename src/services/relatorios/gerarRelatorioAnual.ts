import { db } from "../../libs/mongo";
import { PagamentoRepository } from "../../repositories/pagamento.repository";
import { CriancaRepository } from "../../repositories/crianca.repository";
import { TurmaRepository } from "../../repositories/turma.repository";
import { RelatorioAnualRepository } from "../../repositories/relatorioAnual.repository";
import { agregarMesesDoAno } from "../financeiro/mesesDoAno";
import { inicioMesBrasil } from "../../utils/date";
import { ICrianca } from "../../types/criancas";
import {
  IRelatorioAnual,
  IRelatorioAnualCrianca,
  IRelatorioAnualTotais,
} from "../../types/relatorios";

const TIMEZONE_BRASIL = "America/Sao_Paulo";

const arredondar = (valor: number): number => Math.round(valor * 100) / 100;

interface IAgregadoCriancaMes {
  _id: { criancaId: unknown; mes: number };
  total: number;
  quantidade: number;
}

export const calcularRelatorioAnual = async (
  ano: number,
): Promise<Omit<IRelatorioAnual, "_id" | "createdAt" | "updatedAt">> => {
  await db();

  const inicio = inicioMesBrasil(ano, 1);
  const fim = inicioMesBrasil(ano + 1, 1);

  // Sempre ao vivo (`agregarMesesDoAno`, não `getMesesDoAno`): é este cálculo
  // que produz o snapshot, então ler o snapshot aqui seria circular.
  const [meses, pagamentosPorCriancaMes] = await Promise.all([
    agregarMesesDoAno(ano),
    PagamentoRepository.model.aggregate<IAgregadoCriancaMes>([
      { $match: { status: "pago", pagoEm: { $gte: inicio, $lt: fim } } },
      {
        $group: {
          _id: {
            criancaId: "$criancaId",
            mes: { $month: { date: "$pagoEm", timezone: TIMEZONE_BRASIL } },
          },
          total: { $sum: "$valor" },
          quantidade: { $sum: 1 },
        },
      },
    ]),
  ]);

  const criancas = await montarCriancas(pagamentosPorCriancaMes);

  const totalPagamentos = arredondar(
    meses.reduce((soma, mes) => soma + mes.pagamentos, 0),
  );
  const totalDespesas = arredondar(
    meses.reduce((soma, mes) => soma + mes.despesas, 0),
  );
  const quantidadePagamentos = meses.reduce(
    (soma, mes) => soma + mes.quantidadePagamentos,
    0,
  );

  const totais: IRelatorioAnualTotais = {
    pagamentos: totalPagamentos,
    despesas: totalDespesas,
    saldo: arredondar(totalPagamentos - totalDespesas),
    quantidadePagamentos,
    criancasComPagamento: criancas.length,
    ticketMedio: quantidadePagamentos
      ? arredondar(totalPagamentos / quantidadePagamentos)
      : 0,
  };

  return { ano, consolidadoEm: new Date(), totais, meses, criancas };
};

const montarCriancas = async (
  agregados: IAgregadoCriancaMes[],
): Promise<IRelatorioAnualCrianca[]> => {
  if (agregados.length === 0) return [];

  const criancaIds = [
    ...new Set(agregados.map((item) => String(item._id.criancaId))),
  ];

  const criancas = (await CriancaRepository.find(
    { _id: { $in: criancaIds } },
    { nome: 1, turmaId: 1 },
  )) as Pick<ICrianca, "_id" | "nome" | "turmaId">[];

  const turmaIds = [
    ...new Set(criancas.map((crianca) => crianca.turmaId).filter(Boolean)),
  ];
  const turmas = turmaIds.length
    ? ((await TurmaRepository.find({ _id: { $in: turmaIds } }, { nome: 1 })) as {
        _id: string;
        nome: string;
      }[])
    : [];
  const turmaNomePorId = new Map(
    turmas.map((turma) => [String(turma._id), turma.nome]),
  );
  const criancaPorId = new Map(
    criancas.map((crianca) => [String(crianca._id), crianca]),
  );

  const porCrianca = new Map<string, IRelatorioAnualCrianca>();

  for (const agregado of agregados) {
    const criancaId = String(agregado._id.criancaId);
    const crianca = criancaPorId.get(criancaId);

    if (!porCrianca.has(criancaId)) {
      porCrianca.set(criancaId, {
        criancaId,
        // Criança já removida do cadastro ainda aparece no fechamento —
        // o pagamento existiu e precisa somar no relatório.
        nome: crianca?.nome ?? "Criança removida",
        turmaNome: crianca?.turmaId
          ? (turmaNomePorId.get(String(crianca.turmaId)) ?? null)
          : null,
        total: 0,
        meses: [],
      });
    }

    const linha = porCrianca.get(criancaId)!;
    linha.meses.push({
      mes: agregado._id.mes,
      valor: arredondar(agregado.total),
      quantidadePagamentos: agregado.quantidade,
    });
    linha.total = arredondar(linha.total + agregado.total);
  }

  return [...porCrianca.values()]
    .map((linha) => ({
      ...linha,
      meses: linha.meses.sort((a, b) => a.mes - b.mes),
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
};

/** Fecha o ano em `relatoriosAnuais`. Idempotente: reexecutar sobrescreve. */
export const gerarRelatorioAnualService = async (
  ano: number,
): Promise<IRelatorioAnual> => {
  const relatorio = await calcularRelatorioAnual(ano);

  await RelatorioAnualRepository.updateOne({ ano }, { $set: relatorio }, {
    upsert: true,
  });

  return (await RelatorioAnualRepository.findOne({ ano })) as IRelatorioAnual;
};
