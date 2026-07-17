import { APIGatewayProxyResult } from "aws-lambda";
import { withErrorHandling } from "../../middlewares/errorHandler";
import { requireRole } from "../../middlewares/roleGuard";
import { getTurmaByIdService } from "../../services/turmas/getTurmaById";
import { resolveRequester } from "../../utils/requester";
import { sendSuccessResponse } from "../../utils/http";

export const execute = withErrorHandling(
  requireRole("admin", "professor")(async (event, auth): Promise<APIGatewayProxyResult> => {
    const requester = await resolveRequester(auth);
    const turma = await getTurmaByIdService(requester, event.pathParameters.id);
    return sendSuccessResponse(turma);
  }),
);
