import { ProfessorRepository } from "../../repositories/professor.repository";
import { IProfessor } from "../../types/professores";
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

  return withFotoUrls(professores);
};
