import { EventoRepository } from "../../repositories/evento.repository";
import { TurmaRepository } from "../../repositories/turma.repository";
import { IEvento, IUpdateEventoPayload } from "../../types/eventos";
import { IUsuario } from "../../types/usuarios";
import { httpError, STATUS_CODE } from "../../utils/errors";
import { assertPodeGerenciarEvento, assertProfessorDaTurma } from "../shared/eventoAccess";
import { IEventoComFotosUrl, withFotosUrl } from "./withFotosUrl";

export const atualizarEventoService = async (
  requester: IUsuario,
  eventoId: string,
  payload: IUpdateEventoPayload,
): Promise<IEventoComFotosUrl> => {
  const evento = (await EventoRepository.findById(
    eventoId,
  )) as IEvento | null;
  if (!evento) {
    throw httpError(
      STATUS_CODE.NOT_FOUND,
      "NOT_FOUND",
      "Evento não encontrado.",
    );
  }

  await assertPodeGerenciarEvento(requester, evento);

  if (payload.turmaId) {
    const turma = await TurmaRepository.findById(payload.turmaId);
    if (!turma) {
      throw httpError(
        STATUS_CODE.NOT_FOUND,
        "TURMA_NOT_FOUND",
        "Turma não encontrada.",
      );
    }

    if (requester.papel === "professor") {
      await assertProfessorDaTurma(requester, payload.turmaId);
    }
  }

  const update: Record<string, unknown> = {
    ...payload,
    ...(payload.data && { data: new Date(payload.data) }),
  };

  await EventoRepository.updateOne({ _id: eventoId }, { $set: update });

  return withFotosUrl(
    (await EventoRepository.findById(eventoId)) as IEvento,
  );
};
