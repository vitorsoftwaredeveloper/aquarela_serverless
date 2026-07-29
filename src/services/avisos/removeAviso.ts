import { AvisoRepository } from "../../repositories/aviso.repository";
import { httpError, STATUS_CODE } from "../../utils/errors";

export const removeAvisoService = async (avisoId: string): Promise<void> => {
  const aviso = await AvisoRepository.findById(avisoId);
  if (!aviso) {
    throw httpError(STATUS_CODE.NOT_FOUND, "NOT_FOUND", "Aviso não encontrado.");
  }

  await AvisoRepository.deleteOne({ _id: avisoId });
};
