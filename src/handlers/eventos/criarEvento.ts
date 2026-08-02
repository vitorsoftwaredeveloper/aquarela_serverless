import { APIGatewayProxyResult } from "aws-lambda";
import { withErrorHandling } from "../../middlewares/errorHandler";
import { requireRole } from "../../middlewares/roleGuard";
import { parseRequestBody, validateBody } from "../../middlewares/validate";
import { criarEventoSchema } from "../../schemas/eventos/criarEvento.schema";
import { criarEventoService } from "../../services/eventos/criarEvento";
import { resolveRequester } from "../../utils/requester";
import { sendSuccessResponse } from "../../utils/http";
import { STATUS_CODE } from "../../utils/errors";

export const execute = withErrorHandling(
  requireRole(
    "admin",
    "professor",
  )(async (event, auth): Promise<APIGatewayProxyResult> => {
    const requester = await resolveRequester(auth);
    const payload = validateBody(
      criarEventoSchema,
      parseRequestBody(event.body),
    );

    const evento = await criarEventoService(requester, payload);

    return sendSuccessResponse(evento, STATUS_CODE.CREATED);
  }),
);
