import { APIGatewayProxyResult } from "aws-lambda";
import { withErrorHandling } from "../../middlewares/errorHandler";
import { requireRole } from "../../middlewares/roleGuard";
import { getCriancaByIdService } from "../../services/criancas/getCriancaById";
import { resolveRequester } from "../../utils/requester";
import { sendSuccessResponse } from "../../utils/http";

export const execute = withErrorHandling(
  requireRole("admin", "professor", "responsavel")(
    async (event, auth): Promise<APIGatewayProxyResult> => {
      const requester = await resolveRequester(auth);
      const crianca = await getCriancaByIdService(
        requester,
        event.pathParameters.id,
      );
      return sendSuccessResponse(crianca);
    },
  ),
);
