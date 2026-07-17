import { UsuarioRepository } from "../../repositories/usuario.repository";
import { disableCognitoUser } from "../../libs/cognito";
import { IUsuario } from "../../types/usuarios";
import { httpError, STATUS_CODE } from "../../utils/errors";

export const removeUsuarioService = async (
  usuarioId: string,
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

  if (!usuario.ativo) return; // soft delete idempotente

  await disableCognitoUser(usuario.email);
  await UsuarioRepository.updateOne(
    { _id: usuarioId },
    { $set: { ativo: false } },
  );
};
