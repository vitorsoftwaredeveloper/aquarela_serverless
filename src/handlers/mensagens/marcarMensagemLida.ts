import { APIGatewayProxyResult } from "aws-lambda";
import { withErrorHandling } from "../../middlewares/errorHandler";
import { requireRole } from "../../middlewares/roleGuard";
import { marcarMensagemLidaService } from "../../services/mensagens/marcarMensagemLida";
import { resolveRequester } from "../../utils/requester";
import { sendSuccessResponse } from "../../utils/http";
import { STATUS_CODE } from "../../utils/errors";

export const execute = withErrorHandling(
  requireRole(
    "professor",
    "responsavel",
  )(async (event, auth): Promise<APIGatewayProxyResult> => {
    const requester = await resolveRequester(auth);

    await marcarMensagemLidaService(requester, event.pathParameters.id);

    return sendSuccessResponse(undefined, STATUS_CODE.NO_CONTENT);
  }),
);
