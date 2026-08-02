import { APIGatewayProxyResult } from "aws-lambda";
import { withErrorHandling } from "../../middlewares/errorHandler";
import { requireRole } from "../../middlewares/roleGuard";
import { parseRequestBody, validateBody } from "../../middlewares/validate";
import { atualizarFotosEventoSchema } from "../../schemas/eventos/atualizarFotosEvento.schema";
import { atualizarFotosService } from "../../services/eventos/atualizarFotos";
import { resolveRequester } from "../../utils/requester";
import { sendSuccessResponse } from "../../utils/http";

export const execute = withErrorHandling(
  requireRole(
    "admin",
    "professor",
  )(async (event, auth): Promise<APIGatewayProxyResult> => {
    const requester = await resolveRequester(auth);
    const payload = validateBody(
      atualizarFotosEventoSchema,
      parseRequestBody(event.body),
    );

    const evento = await atualizarFotosService(
      requester,
      event.pathParameters.id,
      payload,
    );

    return sendSuccessResponse(evento);
  }),
);
