import { DespesaRepository } from "../../repositories/despesa.repository";
import { IDespesa } from "../../types/despesas";

export interface IListDespesasFilters {
  categoria?: string;
  de?: string;
  ate?: string;
}

export const listDespesasService = async (
  filters: IListDespesasFilters,
): Promise<IDespesa[]> => {
  const query: Record<string, unknown> = {};
  if (filters.categoria) {
    query.categoria = filters.categoria;
  }
  if (filters.de || filters.ate) {
    query.data = {
      ...(filters.de && { $gte: new Date(filters.de) }),
      ...(filters.ate && { $lte: new Date(filters.ate) }),
    };
  }

  return (await DespesaRepository.find(query, null, {
    sort: { data: -1 },
  })) as IDespesa[];
};
