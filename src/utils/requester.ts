import { AuthClaims } from "../types/auth";
import { IUsuario } from "../types/usuarios";
import { UsuarioRepository } from "../repositories/usuario.repository";
import { ProfessorRepository } from "../repositories/professor.repository";
import { httpError, STATUS_CODE } from "./errors";

/**
 * Resolve o `usuarios` correspondente ao token autenticado. Necessário para
 * checagens de ownership (professor só vê suas turmas, responsável só o
 * próprio filho) já que o JWT só carrega o `cognitoSub`, não o `_id` do
 * domínio nem os vínculos.
 */
export const resolveRequester = async (
  auth: AuthClaims,
): Promise<IUsuario> => {
  const usuario = (await UsuarioRepository.findOne({
    cognitoSub: auth.sub,
  })) as IUsuario | null;

  if (!usuario) {
    throw httpError(STATUS_CODE.FORBIDDEN, "FORBIDDEN", "Usuário sem acesso.");
  }

  return usuario;
};

/**
 * Resolve o `_id` do cadastro de `professores` vinculado ao usuário logado.
 * Usado para restringir turmas/crianças ao professor dono da turma.
 */
export const resolveProfessorId = async (
  usuario: IUsuario,
): Promise<string> => {
  const professor = await ProfessorRepository.findOne({
    usuarioId: usuario._id,
  });

  if (!professor) {
    throw httpError(
      STATUS_CODE.FORBIDDEN,
      "FORBIDDEN",
      "Professor sem cadastro vinculado.",
    );
  }

  return String((professor as any)._id);
};
