import { AgendaRepository } from "../../repositories/agenda.repository";
import { ICreateAgendaPayload, IAgendaDiaria } from "../../types/agendas";
import { IUsuario } from "../../types/usuarios";
import { resolveProfessorId } from "../../utils/requester";
import { loadCriancaDaTurmaDoProfessor } from "../shared/agendaAccess";
import { validarAnexosVinculados } from "../anexos/validarAnexoVinculado";
import {
  httpError,
  STATUS_CODE,
  DUPLICATE_KEY_ERROR_CODE,
} from "../../utils/errors";

export const createAgendaService = async (
  requester: IUsuario,
  payload: ICreateAgendaPayload,
): Promise<IAgendaDiaria> => {
  const crianca = await loadCriancaDaTurmaDoProfessor(
    requester,
    payload.criancaId,
  );
  const professorId = await resolveProfessorId(requester);

  if (payload.anexos && payload.anexos.length > 0) {
    await validarAnexosVinculados("agenda", payload.anexos);
  }

  try {
    const created = await AgendaRepository.insertOne({
      criancaId: payload.criancaId,
      turmaId: crianca.turmaId,
      data: new Date(payload.data),
      registradoPor: professorId,
      alimentacao: payload.alimentacao ?? [],
      sono: payload.sono ?? [],
      atividades: payload.atividades ?? [],
      humor: payload.humor,
      higiene: payload.higiene,
      medicacoesAdministradas: payload.medicacoesAdministradas ?? [],
      intercorrencias: (payload.intercorrencias ?? []).map((item) => ({
        ...item,
        notificado: item.notificado ?? false,
      })),
      observacoes: payload.observacoes,
      tarefaCasa: payload.tarefaCasa,
      presenca: payload.presenca,
      anexos: payload.anexos ?? [],
    });

    return (await AgendaRepository.findById(created._id)) as IAgendaDiaria;
  } catch (error: any) {
    if (error.code === DUPLICATE_KEY_ERROR_CODE) {
      throw httpError(
        STATUS_CODE.CONFLICT,
        "AGENDA_JA_EXISTE",
        "Já existe um registro de agenda para esta criança nesta data.",
      );
    }
    throw error;
  }
};
