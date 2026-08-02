import { EventoRepository } from "../../repositories/evento.repository";
import { TurmaRepository } from "../../repositories/turma.repository";
import { ICreateEventoPayload, IEvento } from "../../types/eventos";
import { IUsuario } from "../../types/usuarios";
import { httpError, STATUS_CODE } from "../../utils/errors";
import { assertProfessorDaTurma } from "../shared/eventoAccess";

export const criarEventoService = async (
  requester: IUsuario,
  payload: ICreateEventoPayload,
): Promise<IEvento> => {
  if (requester.papel === "professor" && !payload.turmaId) {
    throw httpError(
      STATUS_CODE.FORBIDDEN,
      "FORBIDDEN",
      "Professor só cria evento vinculado a uma turma.",
    );
  }

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

  const created = await EventoRepository.insertOne({
    titulo: payload.titulo,
    descricao: payload.descricao,
    data: new Date(payload.data),
    turmaId: payload.turmaId,
    autorId: requester._id,
    fotos: [],
    publicado: false,
  });

  return (await EventoRepository.findById(created._id)) as IEvento;
};
