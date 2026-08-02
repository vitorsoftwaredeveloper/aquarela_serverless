import { APIGatewayProxyResult } from "aws-lambda";
import { withErrorHandling } from "../../middlewares/errorHandler";
import { requireRole } from "../../middlewares/roleGuard";
import { parseRequestBody, validateBody } from "../../middlewares/validate";
import { adicionarFotosEventoSchema } from "../../schemas/eventos/adicionarFotosEvento.schema";
import { adicionarFotosService } from "../../services/eventos/adicionarFotos";
import { resolveRequester } from "../../utils/requester";
import { sendSuccessResponse } from "../../utils/http";

export const execute = withErrorHandling(
  requireRole(
    "admin",
    "professor",
  )(async (event, auth): Promise<APIGatewayProxyResult> => {
    const requester = await resolveRequester(auth);
    const payload = validateBody(
      adicionarFotosEventoSchema,
      parseRequestBody(event.body),
    );

    const evento = await adicionarFotosService(
      requester,
      event.pathParameters.id,
      payload,
    );

    return sendSuccessResponse(evento);
  }),
);
