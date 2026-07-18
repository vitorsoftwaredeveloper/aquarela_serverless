import { AgendaRepository } from "../../repositories/agenda.repository";
import { IAgendaDiaria } from "../../types/agendas";
import { IUsuario } from "../../types/usuarios";
import { loadCriancaParaLeituraAgenda } from "../shared/agendaAccess";

export interface IHistoricoAgendaFilters {
  de?: string;
  ate?: string;
}

export const getHistoricoAgendaService = async (
  requester: IUsuario,
  criancaId: string,
  filters: IHistoricoAgendaFilters,
): Promise<IAgendaDiaria[]> => {
  await loadCriancaParaLeituraAgenda(requester, criancaId);

  const query: Record<string, unknown> = { criancaId };
  if (filters.de || filters.ate) {
    query.data = {
      ...(filters.de && { $gte: new Date(filters.de) }),
      ...(filters.ate && { $lte: new Date(filters.ate) }),
    };
  }

  return (await AgendaRepository.find(query, null, {
    sort: { data: -1 },
  })) as IAgendaDiaria[];
};
