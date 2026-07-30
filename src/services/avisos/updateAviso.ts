import { AvisoRepository } from "../../repositories/aviso.repository";
import { TurmaRepository } from "../../repositories/turma.repository";
import { IAviso, IUpdateAvisoPayload } from "../../types/avisos";
import { httpError, STATUS_CODE } from "../../utils/errors";

export const updateAvisoService = async (
  avisoId: string,
  payload: IUpdateAvisoPayload,
): Promise<IAviso> => {
  const aviso = await AvisoRepository.findById(avisoId);
  if (!aviso) {
    throw httpError(STATUS_CODE.NOT_FOUND, "NOT_FOUND", "Aviso não encontrado.");
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
  }

  await AvisoRepository.updateOne({ _id: avisoId }, { $set: payload });

  return (await AvisoRepository.findById(avisoId)) as IAviso;
};
