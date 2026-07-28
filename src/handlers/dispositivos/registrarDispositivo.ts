import { APIGatewayProxyResult } from "aws-lambda";
import { withErrorHandling } from "../../middlewares/errorHandler";
import { requireRole } from "../../middlewares/roleGuard";
import { parseRequestBody, validateBody } from "../../middlewares/validate";
import { registrarDispositivoSchema } from "../../schemas/dispositivos/registrarDispositivo.schema";
import { registrarDispositivoService } from "../../services/dispositivos/registrarDispositivo";
import { resolveRequester } from "../../utils/requester";
import { sendSuccessResponse } from "../../utils/http";
import { STATUS_CODE } from "../../utils/errors";

export const execute = withErrorHandling(
  requireRole(
    "admin",
    "professor",
    "responsavel",
  )(async (event, auth): Promise<APIGatewayProxyResult> => {
    const requester = await resolveRequester(auth);
    const payload = validateBody(
      registrarDispositivoSchema,
      parseRequestBody(event.body),
    );

    await registrarDispositivoService(requester, payload);

    return sendSuccessResponse(undefined, STATUS_CODE.NO_CONTENT);
  }),
);
