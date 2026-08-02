import { APIGatewayProxyResult } from "aws-lambda";
import { withErrorHandling } from "../../middlewares/errorHandler";
import { requireRole } from "../../middlewares/roleGuard";
import { parseRequestBody, validateBody } from "../../middlewares/validate";
import { atualizarEventoSchema } from "../../schemas/eventos/atualizarEvento.schema";
import { atualizarEventoService } from "../../services/eventos/atualizarEvento";
import { resolveRequester } from "../../utils/requester";
import { sendSuccessResponse } from "../../utils/http";

export const execute = withErrorHandling(
  requireRole(
    "admin",
    "professor",
  )(async (event, auth): Promise<APIGatewayProxyResult> => {
    const requester = await resolveRequester(auth);
    const payload = validateBody(
      atualizarEventoSchema,
      parseRequestBody(event.body),
    );

    const evento = await atualizarEventoService(
      requester,
      event.pathParameters.id,
      payload,
    );

    return sendSuccessResponse(evento);
  }),
);
