import { APIGatewayProxyResult } from "aws-lambda";
import { withErrorHandling } from "../../middlewares/errorHandler";
import { verifyMercadoPagoSignature } from "../../utils/mercadopagoSignature";
import { resolveMercadoPagoWebhookSecret } from "../../libs/mercadopago";
import { processarWebhookMercadoPago } from "../../services/webhooks/processarWebhookMercadoPago";
import { sendSuccessResponse } from "../../utils/http";
import { httpError, STATUS_CODE } from "../../utils/errors";

const readHeader = (headers: Record<string, string> | undefined, name: string) =>
  headers?.[name] ?? headers?.[name.toUpperCase()];

export const execute = withErrorHandling(
  async (event): Promise<APIGatewayProxyResult> => {
    const query = event.queryStringParameters ?? {};
    const body = event.body ? JSON.parse(event.body) : {};
    const dataId = query["data.id"] ?? body?.data?.id;
    const xSignature = readHeader(event.headers, "x-signature");
    const xRequestId = readHeader(event.headers, "x-request-id");

    if (!dataId || !xSignature || !xRequestId) {
      throw httpError(
        STATUS_CODE.BAD_REQUEST,
        "BAD_REQUEST",
        "Notificação inválida.",
      );
    }

    const secret = await resolveMercadoPagoWebhookSecret();
    const assinaturaValida = verifyMercadoPagoSignature({
      xSignature,
      xRequestId,
      dataId: String(dataId),
      secret,
    });

    console.log("mercadopago webhook signature check", {
      dataId: String(dataId),
      xRequestId,
      valid: assinaturaValida,
    });

    if (!assinaturaValida) {
      throw httpError(
        STATUS_CODE.UNAUTHORIZED,
        "UNAUTHORIZED",
        "Assinatura inválida.",
      );
    }

    await processarWebhookMercadoPago(String(dataId));

    return sendSuccessResponse(undefined);
  },
);
