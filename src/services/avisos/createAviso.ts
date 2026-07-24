import { AvisoRepository } from "../../repositories/aviso.repository";
import { TurmaRepository } from "../../repositories/turma.repository";
import { ICreateAvisoPayload, IAviso } from "../../types/avisos";
import { IUsuario } from "../../types/usuarios";
import { httpError, STATUS_CODE } from "../../utils/errors";

export const createAvisoService = async (
  requester: IUsuario,
  payload: ICreateAvisoPayload,
): Promise<IAviso> => {
  if (payload.turmaId) {
    const turma = await TurmaRepository.findById(payload.turmaId);
    if (!turma || !(turma as any).ativo) {
      throw httpError(
        STATUS_CODE.NOT_FOUND,
        "TURMA_NOT_FOUND",
        "Turma não encontrada.",
      );
    }
  }

  const created = await AvisoRepository.insertOne({
    titulo: payload.titulo,
    corpo: payload.corpo,
    autorId: requester._id,
    turmaId: payload.turmaId,
  });

  return (await AvisoRepository.findById(created._id)) as IAviso;
};
