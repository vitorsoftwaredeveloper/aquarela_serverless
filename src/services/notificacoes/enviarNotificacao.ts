import { DispositivoRepository } from "../../repositories/dispositivo.repository";
import { enviarPorFcm } from "./canais/canalFcm";
import { INotificacaoPayload } from "../../types/notificacoes";
import { IDispositivo } from "../../types/dispositivos";

const podarTokenMorto = async (token: string): Promise<void> => {
  await DispositivoRepository.deleteOne({ token });
  console.log("dispositivo removido - token nao registrado", { token });
};

/**
 * Motor com canal plugável: hoje só resolve dispositivos FCM. Um canal
 * WhatsApp para quem não tem token válido entra depois plugando outro
 * `canais/*` aqui dentro, sem mudar quem chama `enviarNotificacao`.
 */
export const enviarNotificacao = async (
  usuarioIds: string[],
  payload: INotificacaoPayload,
): Promise<void> => {
  if (usuarioIds.length === 0) return;

  const dispositivos = (await DispositivoRepository.find({
    usuarioId: { $in: usuarioIds },
  })) as IDispositivo[];

  if (dispositivos.length === 0) {
    console.log("notificacao sem destino - nenhum dispositivo registrado", {
      usuarioIds,
    });
    return;
  }

  const tokens = dispositivos.map((dispositivo) => dispositivo.token);
  const resultados = await enviarPorFcm(tokens, payload);

  await Promise.all(
    resultados
      .filter((resultado) => resultado.tokenInvalido)
      .map((resultado) => podarTokenMorto(resultado.token)),
  );

  const falhas = resultados.filter((resultado) => !resultado.sucesso);
  console.log("notificacao enviada", {
    destinos: tokens.length,
    sucesso: resultados.length - falhas.length,
    falhas: falhas.length,
  });
};
