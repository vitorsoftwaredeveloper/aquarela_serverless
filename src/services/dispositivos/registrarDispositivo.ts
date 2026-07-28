import { DispositivoRepository } from "../../repositories/dispositivo.repository";
import { IRegistrarDispositivoPayload } from "../../types/dispositivos";
import { IUsuario } from "../../types/usuarios";

/**
 * Upsert por `token`: o mesmo token pode reaparecer vinculado a outro
 * usuário quando o dispositivo é compartilhado (outro responsável loga no
 * mesmo navegador) — o registro mais recente é o dono válido do token.
 *
 * 1 notificação por usuário: registrar um token novo remove os outros
 * tokens do mesmo usuário, então só o dispositivo mais recente notifica.
 */
export const registrarDispositivoService = async (
  requester: IUsuario,
  payload: IRegistrarDispositivoPayload,
): Promise<void> => {
  await DispositivoRepository.model.deleteMany({
    usuarioId: requester._id,
    token: { $ne: payload.token },
  });

  await DispositivoRepository.updateOne(
    { token: payload.token },
    {
      usuarioId: requester._id,
      token: payload.token,
      plataforma: payload.plataforma,
      ultimoUsoEm: new Date(),
    },
    { upsert: true },
  );
};
