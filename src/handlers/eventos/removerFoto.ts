import { APIGatewayProxyResult } from "aws-lambda";
import { withErrorHandling } from "../../middlewares/errorHandler";
import { requireRole } from "../../middlewares/roleGuard";
import { removerFotoService } from "../../services/eventos/removerFoto";
import { resolveRequester } from "../../utils/requester";
import { sendSuccessResponse } from "../../utils/http";
import { STATUS_CODE } from "../../utils/errors";

export const execute = withErrorHandling(
  requireRole(
    "admin",
    "professor",
  )(async (event, auth): Promise<APIGatewayProxyResult> => {
    const requester = await resolveRequester(auth);

    await removerFotoService(
      requester,
      event.pathParameters.id,
      decodeURIComponent(event.pathParameters.fotoKey),
    );

    return sendSuccessResponse(undefined, STATUS_CODE.NO_CONTENT);
  }),
);
