import { ProfessorRepository } from "../../repositories/professor.repository";
import { TurmaRepository } from "../../repositories/turma.repository";
import { IProfessor } from "../../types/professores";
import { ITurma } from "../../types/turmas";
import { withFotoUrls } from "../shared/fotoProfessor";

export interface IListProfessoresFilters {
  ativo?: boolean;
}

export const listProfessoresService = async (
  filters: IListProfessoresFilters,
): Promise<IProfessor[]> => {
  const query = { ativo: filters.ativo ?? true };

  const professores = (await ProfessorRepository.find(query, null, {
    sort: { nome: 1 },
  })) as IProfessor[];

  if (professores.length === 0) {
    return withFotoUrls(professores);
  }

  const professorIds = professores.map((p) => p._id);
  const turmas = (await TurmaRepository.find(
    { professorId: { $in: professorIds }, ativo: true },
    { nome: 1, professorId: 1 },
    { sort: { nome: 1 } },
  )) as ITurma[];

  const turmasPorProfessor = new Map<string, { _id: string; nome: string }[]>();
  for (const turma of turmas) {
    const key = String(turma.professorId);
    const lista = turmasPorProfessor.get(key) ?? [];
    lista.push({ _id: String(turma._id), nome: turma.nome });
    turmasPorProfessor.set(key, lista);
  }

  const professoresComTurmas = professores.map((p) => ({
    ...p,
    turmas: turmasPorProfessor.get(String(p._id)) ?? [],
  }));

  return withFotoUrls(professoresComTurmas);
};
