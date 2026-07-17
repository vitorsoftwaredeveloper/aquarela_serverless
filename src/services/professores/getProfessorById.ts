import { ProfessorRepository } from "../../repositories/professor.repository";
import { IProfessor } from "../../types/professores";
import { httpError, STATUS_CODE } from "../../utils/errors";

export const getProfessorByIdService = async (
  professorId: string,
): Promise<IProfessor> => {
  const professor = await ProfessorRepository.findById(professorId);
  if (!professor) {
    throw httpError(
      STATUS_CODE.NOT_FOUND,
      "NOT_FOUND",
      "Professor não encontrado.",
    );
  }
  return professor as IProfessor;
};
