import { ProfessorRepository } from "../../repositories/professor.repository";
import { IProfessor } from "../../types/professores";
import { IUsuario } from "../../types/usuarios";
import { httpError, STATUS_CODE } from "../../utils/errors";
import { isDonoDoProfessor } from "../shared/professorAccess";
import { withFotoUrl } from "../shared/fotoProfessor";

export const getProfessorByIdService = async (
  requester: IUsuario,
  professorId: string,
): Promise<IProfessor> => {
  const professor = (await ProfessorRepository.findById(
    professorId,
  )) as IProfessor | null;
  if (!professor) {
    throw httpError(
      STATUS_CODE.NOT_FOUND,
      "NOT_FOUND",
      "Professor não encontrado.",
    );
  }

  if (
    requester.papel === "professor" &&
    !isDonoDoProfessor(professor, requester)
  ) {
    throw httpError(
      STATUS_CODE.FORBIDDEN,
      "FORBIDDEN",
      "Acesso permitido apenas ao próprio cadastro.",
    );
  }

  return withFotoUrl(professor);
};
