import { PlanoAulaRepository } from "../../repositories/planoAula.repository";
import { IPlanoAula } from "../../types/planosAula";
import { IUsuario } from "../../types/usuarios";
import { resolveProfessorId } from "../../utils/requester";
import { getTurmaByIdService } from "../turmas/getTurmaById";

export interface IListPlanosAulaFilters {
  turmaId?: string;
}

export const listPlanosAulaService = async (
  requester: IUsuario,
  filters: IListPlanosAulaFilters,
): Promise<IPlanoAula[]> => {
  const query: Record<string, unknown> = {};

  if (filters.turmaId) {
    // valida existência da turma + ownership (professor só a sua)
    await getTurmaByIdService(requester, filters.turmaId);
    query.turmaId = filters.turmaId;
  } else if (requester.papel === "professor") {
    query.professorId = await resolveProfessorId(requester);
  }

  return (await PlanoAulaRepository.find(query, null, {
    sort: { data: -1 },
  })) as IPlanoAula[];
};
