import { getMessagingClient } from "../../../libs/firebase";
import { INotificacaoPayload, IResultadoEnvioToken } from "../../../types/notificacoes";

/**
 * Corpo genérico por design (LGPD): nunca leva saúde/alimentação/nome de
 * medicação — a notificação aparece na tela de bloqueio. Detalhe fica só no
 * app autenticado.
 */
export const enviarPorFcm = async (
  tokens: string[],
  payload: INotificacaoPayload,
): Promise<IResultadoEnvioToken[]> => {
  if (tokens.length === 0) return [];

  const messaging = await getMessagingClient();
  const resposta = await messaging.sendEachForMulticast({
    tokens,
    webpush: {
      headers: { Urgency: "high" },
      ...(payload.link ? { fcmOptions: { link: payload.link } } : {}),
    },
    data: {
      ...(payload.dados ?? {}),
      title: payload.titulo,
      body: payload.corpo,
    },
  });

  return resposta.responses.map((resultado, indice) => ({
    token: tokens[indice],
    sucesso: resultado.success,
    tokenInvalido:
      resultado.error?.code === "messaging/registration-token-not-registered",
    erro: resultado.error?.message,
  }));
};
