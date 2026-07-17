import { CriancaRepository } from "../../repositories/crianca.repository";
import { httpError, STATUS_CODE } from "../../utils/errors";

export const removeCriancaService = async (criancaId: string): Promise<void> => {
  const crianca = await CriancaRepository.findById(criancaId);
  if (!crianca) {
    throw httpError(STATUS_CODE.NOT_FOUND, "NOT_FOUND", "Criança não encontrada.");
  }

  if (!(crianca as any).ativo) return; // soft delete idempotente

  await CriancaRepository.updateOne(
    { _id: criancaId },
    { $set: { ativo: false } },
  );
};
