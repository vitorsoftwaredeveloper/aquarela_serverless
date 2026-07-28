import { DispositivoRepository } from "../../repositories/dispositivo.repository";
import { IUsuario } from "../../types/usuarios";

/**
 * Remove só se o token pertencer ao usuário autenticado — evita que um
 * usuário derrube a sessão de push de outro só adivinhando o token alheio.
 */
export const removerDispositivoService = async (
  requester: IUsuario,
  token: string,
): Promise<void> => {
  await DispositivoRepository.deleteOne({
    token,
    usuarioId: requester._id,
  });
};
