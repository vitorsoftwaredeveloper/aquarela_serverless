import { UsuarioRepository } from "../../repositories/usuario.repository";
import { changeCognitoUserGroup } from "../../libs/cognito";
import { IUpdateUsuarioPayload, IUsuario } from "../../types/usuarios";
import { httpError, STATUS_CODE } from "../../utils/errors";

export const updateUsuarioService = async (
  usuarioId: string,
  payload: IUpdateUsuarioPayload,
): Promise<IUsuario> => {
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

  if (payload.papel && payload.papel !== usuario.papel) {
    await changeCognitoUserGroup(usuario.email, usuario.papel, payload.papel);
  }

  await UsuarioRepository.updateOne({ _id: usuarioId }, { $set: payload });

  return (await UsuarioRepository.findById(usuarioId)) as IUsuario;
};
