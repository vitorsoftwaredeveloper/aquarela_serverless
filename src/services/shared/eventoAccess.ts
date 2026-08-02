import { TurmaRepository } from "../../repositories/turma.repository";
import { IEvento } from "../../types/eventos";
import { IUsuario } from "../../types/usuarios";
import { resolveProfessorId } from "../../utils/requester";
import { httpError, STATUS_CODE } from "../../utils/errors";

export const assertProfessorDaTurma = async (
  requester: IUsuario,
  turmaId: string,
): Promise<void> => {
  const turma = await TurmaRepository.findById(turmaId);
  const professorId = await resolveProfessorId(requester);

  if (
    !turma ||
    !(turma as any).professorIds.map(String).includes(professorId)
  ) {
    throw httpError(
      STATUS_CODE.FORBIDDEN,
      "FORBIDDEN",
      "Acesso permitido apenas às suas turmas.",
    );
  }
};

/**
 * Admin gerencia qualquer evento. Professor só gerencia evento de turma que
 * leciona — evento sem `turmaId` é da escola inteira e fica exclusivo do
 * admin (mesma regra do escopo de `/avisos`).
 */
export const assertPodeGerenciarEvento = async (
  requester: IUsuario,
  evento: IEvento,
): Promise<void> => {
  if (requester.papel === "admin") return;

  if (requester.papel !== "professor") {
    throw httpError(
      STATUS_CODE.FORBIDDEN,
      "FORBIDDEN",
      "Acesso permitido apenas à administração e professores.",
    );
  }

  if (!evento.turmaId) {
    throw httpError(
      STATUS_CODE.FORBIDDEN,
      "FORBIDDEN",
      "Apenas a administração gerencia eventos da escola inteira.",
    );
  }

  await assertProfessorDaTurma(requester, evento.turmaId);
};
