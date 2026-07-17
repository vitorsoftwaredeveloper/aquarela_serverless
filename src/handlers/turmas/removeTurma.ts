import { APIGatewayProxyResult } from "aws-lambda";
import { withErrorHandling } from "../../middlewares/errorHandler";
import { requireRole } from "../../middlewares/roleGuard";
import { removeTurmaService } from "../../services/turmas/removeTurma";
import { sendSuccessResponse } from "../../utils/http";
import { STATUS_CODE } from "../../utils/errors";

export const execute = withErrorHandling(
  requireRole("admin")(async (event): Promise<APIGatewayProxyResult> => {
    await removeTurmaService(event.pathParameters.id);
    return sendSuccessResponse(undefined, STATUS_CODE.NO_CONTENT);
  }),
);
