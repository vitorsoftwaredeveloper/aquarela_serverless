import { APIGatewayProxyResult } from "aws-lambda";
import { withErrorHandling } from "../../middlewares/errorHandler";
import { requireRole } from "../../middlewares/roleGuard";
import { removerDispositivoService } from "../../services/dispositivos/removerDispositivo";
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
    const token = decodeURIComponent(event.pathParameters.token);

    await removerDispositivoService(requester, token);

    return sendSuccessResponse(undefined, STATUS_CODE.NO_CONTENT);
  }),
);
