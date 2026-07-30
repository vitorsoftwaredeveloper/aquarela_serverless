import { TurmaRepository } from "../../repositories/turma.repository";
import { CriancaRepository } from "../../repositories/crianca.repository";
import { AgendaRepository } from "../../repositories/agenda.repository";
import { ProfessorRepository } from "../../repositories/professor.repository";
import { ITurma } from "../../types/turmas";
import { IProfessor } from "../../types/professores";
import { IUsuario } from "../../types/usuarios";
import { resolveProfessorId } from "../../utils/requester";
import { hojeMeiaNoiteBrasil } from "../../utils/date";

export const listTurmasService = async (
  requester: IUsuario,
): Promise<ITurma[]> => {
  const query: Record<string, unknown> = {};

  if (requester.papel === "professor") {
    query.professorId = await resolveProfessorId(requester);
  }

  const turmas = (await TurmaRepository.find(query, null, {
    sort: { nome: 1 },
  })) as ITurma[];

  if (turmas.length === 0) {
    return turmas;
  }

  const professorIds = [...new Set(turmas.map((t) => t.professorId))];
  const professores = (await ProfessorRepository.find(
    { _id: { $in: professorIds } },
    { nome: 1, email: 1 },
  )) as IProfessor[];

  const professorPorId = new Map(
    professores.map((p) => [String(p._id), { _id: String(p._id), nome: p.nome, email: p.email }]),
  );

  const turmasComProfessor = turmas.map((t) => ({
    ...t,
    professor: professorPorId.get(String(t.professorId)) ?? null,
  }));

  const turmaIds = turmas.map((t) => t._id);

  const contarPorTurma = (docs: { turmaId: unknown }[]): Map<string, number> => {
    const mapa = new Map<string, number>();
    for (const doc of docs) {
      const key = String(doc.turmaId);
      mapa.set(key, (mapa.get(key) ?? 0) + 1);
    }
    return mapa;
  };

  if (requester.papel !== "professor") {
    const criancasDasTurmas = await CriancaRepository.find(
      { turmaId: { $in: turmaIds } },
      { turmaId: 1 },
    );
    const totalPorTurma = contarPorTurma(
      criancasDasTurmas as { turmaId: unknown }[],
    );
    return turmasComProfessor.map((t) => ({
      ...t,
      totalCriancas: totalPorTurma.get(String(t._id)) ?? 0,
    }));
  }

  // find() (não aggregate): poucos registros por professor nesta escala, e o
  // Mongoose casta `turmaId` (ObjectId) automaticamente no filtro — aggregate()
  // faz o $match direto no driver, sem esse cast, e falharia em silêncio
  // (0 resultados) se `turmaId` chegasse como string em vez de ObjectId.
  const [criancasDasTurmas, agendasHoje] = await Promise.all([
    CriancaRepository.find(
      { turmaId: { $in: turmaIds } },
      { turmaId: 1 },
    ),
    AgendaRepository.find(
      { turmaId: { $in: turmaIds }, data: hojeMeiaNoiteBrasil() },
      { turmaId: 1 },
    ),
  ]);

  const totalPorTurma = contarPorTurma(
    criancasDasTurmas as { turmaId: unknown }[],
  );
  const registradasPorTurma = contarPorTurma(
    agendasHoje as { turmaId: unknown }[],
  );

  return turmasComProfessor.map((t) => {
    const total = totalPorTurma.get(String(t._id)) ?? 0;
    const registradas = registradasPorTurma.get(String(t._id)) ?? 0;
    return {
      ...t,
      totalCriancas: total,
      agendasPendentes: Math.max(0, total - registradas),
    };
  });
};
