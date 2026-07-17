import { ProfessorRepository } from "../../repositories/professor.repository";
import { IProfessor } from "../../types/professores";

export interface IListProfessoresFilters {
  ativo?: boolean;
}

export const listProfessoresService = async (
  filters: IListProfessoresFilters,
): Promise<IProfessor[]> => {
  const query = { ativo: filters.ativo ?? true };

  return (await ProfessorRepository.find(query, null, {
    sort: { nome: 1 },
  })) as IProfessor[];
};
