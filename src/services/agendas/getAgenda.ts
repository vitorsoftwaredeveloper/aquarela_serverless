import { AgendaRepository } from "../../repositories/agenda.repository";
import { IAgendaDiaria } from "../../types/agendas";
import { IUsuario } from "../../types/usuarios";
import { loadCriancaParaLeituraAgenda } from "../shared/agendaAccess";
import { httpError, STATUS_CODE } from "../../utils/errors";

export const getAgendaService = async (
  requester: IUsuario,
  criancaId: string,
  data: string,
): Promise<IAgendaDiaria> => {
  await loadCriancaParaLeituraAgenda(requester, criancaId);

  const agenda = (await AgendaRepository.findOne({
    criancaId,
    data: new Date(data),
  })) as IAgendaDiaria | null;

  if (!agenda) {
    throw httpError(
      STATUS_CODE.NOT_FOUND,
      "NOT_FOUND",
      "Registro de agenda não encontrado para esta data.",
    );
  }

  return agenda;
};
