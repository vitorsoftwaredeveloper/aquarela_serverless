import { AgendaRepository } from "../../repositories/agenda.repository";
import { IUpdateAgendaPayload, IAgendaDiaria } from "../../types/agendas";
import { IUsuario } from "../../types/usuarios";
import { loadCriancaDaTurmaDoProfessor } from "../shared/agendaAccess";
import { httpError, STATUS_CODE } from "../../utils/errors";

export const updateAgendaService = async (
  requester: IUsuario,
  agendaId: string,
  payload: IUpdateAgendaPayload,
): Promise<IAgendaDiaria> => {
  const agenda = (await AgendaRepository.findById(
    agendaId,
  )) as IAgendaDiaria | null;
  if (!agenda) {
    throw httpError(
      STATUS_CODE.NOT_FOUND,
      "NOT_FOUND",
      "Registro de agenda não encontrado.",
    );
  }

  await loadCriancaDaTurmaDoProfessor(requester, agenda.criancaId);

  const update: Record<string, unknown> = { ...payload };
  if (payload.intercorrencias) {
    update.intercorrencias = payload.intercorrencias.map((item) => ({
      ...item,
      notificado: item.notificado ?? false,
    }));
  }

  await AgendaRepository.updateOne({ _id: agendaId }, { $set: update });

  return (await AgendaRepository.findById(agendaId)) as IAgendaDiaria;
};
