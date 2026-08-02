import { APIGatewayProxyResult } from "aws-lambda";
import { withErrorHandling } from "../../middlewares/errorHandler";
import { requireRole } from "../../middlewares/roleGuard";
import { removeEventoService } from "../../services/eventos/removeEvento";
import { resolveRequester } from "../../utils/requester";
import { sendSuccessResponse } from "../../utils/http";
import { STATUS_CODE } from "../../utils/errors";

export const execute = withErrorHandling(
  requireRole(
    "admin",
    "professor",
  )(async (event, auth): Promise<APIGatewayProxyResult> => {
    const requester = await resolveRequester(auth);

    await removeEventoService(requester, event.pathParameters.id);

    return sendSuccessResponse(undefined, STATUS_CODE.NO_CONTENT);
  }),
);
