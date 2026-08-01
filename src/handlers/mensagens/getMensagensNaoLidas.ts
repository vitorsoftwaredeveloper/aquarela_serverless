import { APIGatewayProxyResult } from "aws-lambda";
import { withErrorHandling } from "../../middlewares/errorHandler";
import { requireRole } from "../../middlewares/roleGuard";
import { getMensagensNaoLidasService } from "../../services/mensagens/getMensagensNaoLidas";
import { resolveRequester } from "../../utils/requester";
import { sendSuccessResponse } from "../../utils/http";

export const execute = withErrorHandling(
  requireRole(
    "professor",
    "responsavel",
  )(async (event, auth): Promise<APIGatewayProxyResult> => {
    const requester = await resolveRequester(auth);

    const naoLidas = await getMensagensNaoLidasService(requester);

    return sendSuccessResponse(naoLidas);
  }),
);
