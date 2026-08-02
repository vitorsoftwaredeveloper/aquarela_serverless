import { db } from "../../libs/mongo";
import { CriancaRepository } from "../../repositories/crianca.repository";
import { TurmaRepository } from "../../repositories/turma.repository";
import { ProfessorRepository } from "../../repositories/professor.repository";
import { enviarNotificacao } from "../notificacoes/enviarNotificacao";
import { hojeMeiaNoiteBrasil, diaMesDeData } from "../../utils/date";
import { ICrianca } from "../../types/criancas";
import { ITurma } from "../../types/turmas";
import { IProfessor } from "../../types/professores";

export interface IResultadoNotificarAniversariantes {
  aniversariantes: number;
  responsaveisNotificados: number;
  turmasNotificadas: number;
}

function corpoResponsavel(nomes: string[]): string {
  if (nomes.length === 1) {
    return `Hoje é aniversário da ${nomes[0]}! 🎉`;
  }
  return `Hoje é aniversário de ${nomes.length} dos seus filhos: ${nomes.join(", ")}! 🎉`;
}

function corpoTurma(nomes: string[], turmaNome: string): string {
  if (nomes.length === 1) {
    return `Hoje é aniversário de ${nomes[0]} na Turma ${turmaNome}!`;
  }
  return `Hoje é aniversário de ${nomes.length} alunos da Turma ${turmaNome}!`;
}

/**
 * Cron diário (08:00 GMT-3, ver functions.yml). Só marca — a idempotência é
 * por `ultimoAniversarioNotificadoEm` (reexecução no mesmo dia não duplica).
 * Admin não recebe push: o card de aniversariante do dashboard lê
 * `GET /criancas` direto (dado já carregado), sem canal de notificação.
 */
export const notificarAniversariantesService =
  async (): Promise<IResultadoNotificarAniversariantes> => {
    await db();

    const hoje = hojeMeiaNoiteBrasil();
    const hojeDiaMes = diaMesDeData(hoje);

    const aniversariantes = (await CriancaRepository.find(
      {
        nascimentoDiaMes: hojeDiaMes,
        $or: [
          { ultimoAniversarioNotificadoEm: null },
          { ultimoAniversarioNotificadoEm: { $lt: hoje } },
        ],
      },
      { nome: 1, turmaId: 1, responsaveis: 1 },
    )) as ICrianca[];

    if (aniversariantes.length === 0) {
      return {
        aniversariantes: 0,
        responsaveisNotificados: 0,
        turmasNotificadas: 0,
      };
    }

    // Agrega por responsável (1 push por pessoa, mesmo padrão de cobranças).
    const nomesPorResponsavel = new Map<string, string[]>();
    for (const crianca of aniversariantes) {
      const usuarioIds = (crianca.responsaveis ?? [])
        .map((r) => r.usuarioId)
        .filter((id): id is string => Boolean(id))
        .map(String);
      for (const usuarioId of usuarioIds) {
        const nomes = nomesPorResponsavel.get(usuarioId) ?? [];
        nomes.push(crianca.nome);
        nomesPorResponsavel.set(usuarioId, nomes);
      }
    }

    await Promise.all(
      [...nomesPorResponsavel.entries()].map(([usuarioId, nomes]) =>
        enviarNotificacao([usuarioId], {
          titulo: "Aquarela Kids",
          corpo: corpoResponsavel(nomes),
          dados: { tipo: "aniversario", url: "/inicio" },
        }),
      ),
    );

    // Agrega por turma (1 push para todos os professores daquela turma).
    const criancasPorTurma = new Map<string, string[]>();
    for (const crianca of aniversariantes) {
      if (!crianca.turmaId) continue;
      const turmaId = String(crianca.turmaId);
      const nomes = criancasPorTurma.get(turmaId) ?? [];
      nomes.push(crianca.nome);
      criancasPorTurma.set(turmaId, nomes);
    }

    let turmasNotificadas = 0;
    if (criancasPorTurma.size > 0) {
      const turmaIds = [...criancasPorTurma.keys()];
      const turmas = (await TurmaRepository.find(
        { _id: { $in: turmaIds } },
        { nome: 1, professorIds: 1 },
      )) as ITurma[];

      const professorIds = [
        ...new Set(turmas.flatMap((t) => t.professorIds.map(String))),
      ];
      const professores = professorIds.length
        ? ((await ProfessorRepository.find(
            { _id: { $in: professorIds } },
            { usuarioId: 1 },
          )) as IProfessor[])
        : [];
      const usuarioIdPorProfessorId = new Map(
        professores.map((p) => [String(p._id), String(p.usuarioId)]),
      );

      await Promise.all(
        turmas.map((turma) => {
          const nomes = criancasPorTurma.get(String(turma._id));
          if (!nomes) return Promise.resolve();
          const usuarioIds = turma.professorIds
            .map((id) => usuarioIdPorProfessorId.get(String(id)))
            .filter((id): id is string => Boolean(id));
          if (usuarioIds.length === 0) return Promise.resolve();
          turmasNotificadas += 1;
          return enviarNotificacao(usuarioIds, {
            titulo: "Aquarela Kids",
            corpo: corpoTurma(nomes, turma.nome),
            dados: { tipo: "aniversario", url: "/professor/turmas" },
          });
        }),
      );
    }

    const agora = new Date();
    await CriancaRepository.model.updateMany(
      { _id: { $in: aniversariantes.map((c) => c._id) } },
      { $set: { ultimoAniversarioNotificadoEm: agora } },
    );

    return {
      aniversariantes: aniversariantes.length,
      responsaveisNotificados: nomesPorResponsavel.size,
      turmasNotificadas,
    };
  };
