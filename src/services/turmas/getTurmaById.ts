import { TurmaRepository } from "../../repositories/turma.repository";
import { ITurma } from "../../types/turmas";
import { IUsuario } from "../../types/usuarios";
import { resolveProfessorId } from "../../utils/requester";
import { httpError, STATUS_CODE } from "../../utils/errors";

export const getTurmaByIdService = async (
  requester: IUsuario,
  turmaId: string,
): Promise<ITurma> => {
  const turma = (await TurmaRepository.findById(turmaId)) as ITurma | null;
  if (!turma) {
    throw httpError(STATUS_CODE.NOT_FOUND, "NOT_FOUND", "Turma não encontrada.");
  }

  if (requester.papel === "professor") {
    const professorId = await resolveProfessorId(requester);
    if (String(turma.professorId) !== professorId) {
      throw httpError(
        STATUS_CODE.FORBIDDEN,
        "FORBIDDEN",
        "Acesso permitido apenas às suas turmas.",
      );
    }
  }

  return turma;
};
