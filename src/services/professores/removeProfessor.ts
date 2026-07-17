import { ProfessorRepository } from "../../repositories/professor.repository";
import { TurmaRepository } from "../../repositories/turma.repository";
import { httpError, STATUS_CODE } from "../../utils/errors";

export const removeProfessorService = async (
  professorId: string,
): Promise<void> => {
  const professor = await ProfessorRepository.findById(professorId);
  if (!professor) {
    throw httpError(
      STATUS_CODE.NOT_FOUND,
      "NOT_FOUND",
      "Professor não encontrado.",
    );
  }

  if (!professor.ativo) return; // soft delete idempotente

  const turmaVinculada = await TurmaRepository.findOne({
    professorId,
    ativo: true,
  });
  if (turmaVinculada) {
    throw httpError(
      STATUS_CODE.CONFLICT,
      "PROFESSOR_COM_TURMA_VINCULADA",
      "Não é possível remover: professor possui turma(s) ativa(s) vinculada(s). Troque a professora da turma antes.",
    );
  }

  await ProfessorRepository.updateOne(
    { _id: professorId },
    { $set: { ativo: false } },
  );
};
