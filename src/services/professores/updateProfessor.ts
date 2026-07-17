import { ProfessorRepository } from "../../repositories/professor.repository";
import { IProfessor, IUpdateProfessorPayload } from "../../types/professores";
import { httpError, STATUS_CODE } from "../../utils/errors";

export const updateProfessorService = async (
  professorId: string,
  payload: IUpdateProfessorPayload,
): Promise<IProfessor> => {
  const professor = await ProfessorRepository.findById(professorId);
  if (!professor) {
    throw httpError(
      STATUS_CODE.NOT_FOUND,
      "NOT_FOUND",
      "Professor não encontrado.",
    );
  }

  const update = {
    ...payload,
    ...(payload.email && { email: payload.email.toLowerCase() }),
  };

  await ProfessorRepository.updateOne({ _id: professorId }, { $set: update });

  return (await ProfessorRepository.findById(professorId)) as IProfessor;
};
