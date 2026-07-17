import { APIGatewayProxyResult } from "aws-lambda";
import { withErrorHandling } from "../../middlewares/errorHandler";
import { requireRole } from "../../middlewares/roleGuard";
import { listTurmasService } from "../../services/turmas/listTurmas";
import { resolveRequester } from "../../utils/requester";
import { sendSuccessResponse } from "../../utils/http";

export const execute = withErrorHandling(
  requireRole("admin", "professor")(async (event, auth): Promise<APIGatewayProxyResult> => {
    const requester = await resolveRequester(auth);
    const query = event.queryStringParameters ?? {};

    const turmas = await listTurmasService(requester, {
      ativo: query.ativo !== undefined ? query.ativo === "true" : undefined,
    });

    return sendSuccessResponse(turmas);
  }),
);
