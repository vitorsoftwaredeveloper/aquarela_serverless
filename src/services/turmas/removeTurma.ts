import { TurmaRepository } from "../../repositories/turma.repository";
import { CriancaRepository } from "../../repositories/crianca.repository";
import { httpError, STATUS_CODE } from "../../utils/errors";

export const removeTurmaService = async (turmaId: string): Promise<void> => {
  const turma = await TurmaRepository.findById(turmaId);
  if (!turma) {
    throw httpError(STATUS_CODE.NOT_FOUND, "NOT_FOUND", "Turma não encontrada.");
  }

  if (!(turma as any).ativo) return; // soft delete idempotente

  const criancaAtiva = await CriancaRepository.findOne({
    turmaId,
    ativo: true,
  });
  if (criancaAtiva) {
    throw httpError(
      STATUS_CODE.CONFLICT,
      "TURMA_COM_CRIANCAS_VINCULADAS",
      "Não é possível remover: há crianças ativas vinculadas a esta turma. Realoque-as antes.",
    );
  }

  await TurmaRepository.updateOne({ _id: turmaId }, { $set: { ativo: false } });
};
