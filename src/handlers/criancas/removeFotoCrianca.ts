import { APIGatewayProxyResult } from "aws-lambda";
import { withErrorHandling } from "../../middlewares/errorHandler";
import { requireRole } from "../../middlewares/roleGuard";
import { removeFotoCriancaService } from "../../services/criancas/removeFotoCrianca";
import { resolveRequester } from "../../utils/requester";
import { sendSuccessResponse } from "../../utils/http";
import { STATUS_CODE } from "../../utils/errors";

export const execute = withErrorHandling(
  requireRole("admin")(async (event, auth): Promise<APIGatewayProxyResult> => {
    const requester = await resolveRequester(auth);

    await removeFotoCriancaService(requester, event.pathParameters.id);

    return sendSuccessResponse(undefined, STATUS_CODE.NO_CONTENT);
  }),
);
