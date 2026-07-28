import { AgendaRepository } from "../../repositories/agenda.repository";
import { ProfessorRepository } from "../../repositories/professor.repository";
import { IAgendaDiaria } from "../../types/agendas";
import { IUsuario } from "../../types/usuarios";
import { loadCriancaParaLeituraAgenda } from "../shared/agendaAccess";
import { withFotoUrls } from "../shared/fotoProfessor";

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

  const agendas = (await AgendaRepository.find(query, null, {
    sort: { data: -1 },
  })) as IAgendaDiaria[];

  const professorIds = [...new Set(agendas.map((a) => String(a.registradoPor)))];
  const professores = await withFotoUrls(
    await ProfessorRepository.find({ _id: { $in: professorIds } }, { nome: 1, foto: 1 }),
  );
  const professorPorId = new Map(
    professores.map((p) => [
      String(p._id),
      { _id: String(p._id), nome: p.nome, fotoUrl: p.fotoUrl },
    ]),
  );

  return agendas.map((agenda) => ({
    ...agenda,
    professor: professorPorId.get(String(agenda.registradoPor)),
  }));
};
