import { IProfessor } from "../../types/professores";
import { IUsuario } from "../../types/usuarios";
import { httpError, STATUS_CODE } from "../../utils/errors";

/**
 * `email` fica de fora do próprio professor: é o username no Cognito e o
 * vínculo com o `usuarios` criado pelo admin, então só admin altera.
 */
export const CAMPOS_EXCLUSIVOS_ADMIN = ["email"] as const;

export const isDonoDoProfessor = (
  professor: IProfessor,
  usuario: IUsuario,
): boolean => String(professor.usuarioId) === String(usuario._id);

/**
 * Admin edita qualquer professor e qualquer campo; professor edita só o
 * próprio cadastro e nunca `email`.
 */
export const assertPodeEditarProfessor = (
  requester: IUsuario,
  professor: IProfessor,
  payload: Partial<Record<(typeof CAMPOS_EXCLUSIVOS_ADMIN)[number], unknown>>,
): void => {
  if (requester.papel === "admin") return;

  if (!isDonoDoProfessor(professor, requester)) {
    throw httpError(
      STATUS_CODE.FORBIDDEN,
      "FORBIDDEN",
      "Acesso permitido apenas ao próprio cadastro.",
    );
  }

  const bloqueados = CAMPOS_EXCLUSIVOS_ADMIN.filter(
    (campo) => payload[campo] !== undefined,
  );

  if (bloqueados.length > 0) {
    throw httpError(
      STATUS_CODE.FORBIDDEN,
      "FORBIDDEN",
      `Apenas a administração pode alterar: ${bloqueados.join(", ")}.`,
    );
  }
};
