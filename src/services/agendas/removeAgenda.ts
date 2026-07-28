import { AgendaRepository } from "../../repositories/agenda.repository";
import { IAgendaDiaria } from "../../types/agendas";
import { IUsuario } from "../../types/usuarios";
import { loadCriancaDaTurmaDoProfessor } from "../shared/agendaAccess";
import { httpError, STATUS_CODE } from "../../utils/errors";

export const removeAgendaService = async (
  requester: IUsuario,
  agendaId: string,
): Promise<void> => {
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

  await AgendaRepository.deleteOne({ _id: agendaId });
};
