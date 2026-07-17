import { TurmaRepository } from "../../repositories/turma.repository";
import { ITurma } from "../../types/turmas";
import { IUsuario } from "../../types/usuarios";
import { resolveProfessorId } from "../../utils/requester";

export interface IListTurmasFilters {
  ativo?: boolean;
}

export const listTurmasService = async (
  requester: IUsuario,
  filters: IListTurmasFilters,
): Promise<ITurma[]> => {
  const query: Record<string, unknown> = { ativo: filters.ativo ?? true };

  if (requester.papel === "professor") {
    query.professorId = await resolveProfessorId(requester);
  }

  return (await TurmaRepository.find(query, null, {
    sort: { nome: 1 },
  })) as ITurma[];
};
