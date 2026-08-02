import { TurmaRepository } from "../../repositories/turma.repository";
import { ProfessorRepository } from "../../repositories/professor.repository";
import { ITurma, IUpdateTurmaPayload } from "../../types/turmas";
import { httpError, STATUS_CODE } from "../../utils/errors";

export const updateTurmaService = async (
  turmaId: string,
  payload: IUpdateTurmaPayload,
): Promise<ITurma> => {
  const turma = (await TurmaRepository.findById(turmaId)) as ITurma | null;
  if (!turma) {
    throw httpError(STATUS_CODE.NOT_FOUND, "NOT_FOUND", "Turma não encontrada.");
  }

  const faixaEtaria = payload.faixaEtaria ?? turma.faixaEtaria;
  if (faixaEtaria.min > faixaEtaria.max) {
    throw httpError(
      STATUS_CODE.BAD_REQUEST,
      "FAIXA_ETARIA_INVALIDA",
      "Idade mínima não pode ser maior que a máxima.",
    );
  }

  if (payload.professorIds) {
    const professores = await ProfessorRepository.find({
      _id: { $in: payload.professorIds },
    });
    if (professores.length !== new Set(payload.professorIds).size) {
      throw httpError(
        STATUS_CODE.NOT_FOUND,
        "PROFESSOR_NOT_FOUND",
        "Professor não encontrado.",
      );
    }
  }

  await TurmaRepository.updateOne({ _id: turmaId }, { $set: payload });

  return (await TurmaRepository.findById(turmaId)) as ITurma;
};
