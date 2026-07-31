import { UsuarioRepository } from "../../repositories/usuario.repository";
import { adminSetUserPassword } from "../../libs/cognito";
import { IUsuario, IRedefinirSenhaPayload } from "../../types/usuarios";
import { httpError, STATUS_CODE } from "../../utils/errors";

export const redefinirSenhaUsuarioService = async (
  usuarioId: string,
  payload: IRedefinirSenhaPayload,
): Promise<void> => {
  const usuario = (await UsuarioRepository.findById(
    usuarioId,
  )) as IUsuario | null;

  if (!usuario) {
    throw httpError(
      STATUS_CODE.NOT_FOUND,
      "NOT_FOUND",
      "Usuário não encontrado.",
    );
  }

  try {
    await adminSetUserPassword(usuario.email, payload.novaSenha);
  } catch (error) {
    if ((error as { name?: string }).name === "InvalidPasswordException") {
      throw httpError(
        STATUS_CODE.UNPROCESSABLE_ENTITY,
        "SENHA_INVALIDA",
        "A senha não atende aos requisitos mínimos do Cognito.",
      );
    }
    throw error;
  }
};
