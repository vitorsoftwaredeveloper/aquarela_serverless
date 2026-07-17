import { UsuarioRepository } from "../../repositories/usuario.repository";
import { IUsuario } from "../../types/usuarios";
import { httpError, STATUS_CODE } from "../../utils/errors";

export const getUsuarioByIdService = async (
  usuarioId: string,
): Promise<IUsuario> => {
  const usuario = await UsuarioRepository.findById(usuarioId);
  if (!usuario) {
    throw httpError(
      STATUS_CODE.NOT_FOUND,
      "NOT_FOUND",
      "Usuário não encontrado.",
    );
  }
  return usuario as IUsuario;
};
