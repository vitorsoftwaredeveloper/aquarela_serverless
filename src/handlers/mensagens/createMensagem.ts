import { APIGatewayProxyResult } from "aws-lambda";
import { withErrorHandling } from "../../middlewares/errorHandler";
import { requireRole } from "../../middlewares/roleGuard";
import { parseRequestBody, validateBody } from "../../middlewares/validate";
import { createMensagemSchema } from "../../schemas/mensagens/createMensagem.schema";
import { createMensagemService } from "../../services/mensagens/createMensagem";
import { resolveRequester } from "../../utils/requester";
import { sendSuccessResponse } from "../../utils/http";
import { STATUS_CODE } from "../../utils/errors";

export const execute = withErrorHandling(
  requireRole(
    "professor",
    "responsavel",
  )(async (event, auth): Promise<APIGatewayProxyResult> => {
    const requester = await resolveRequester(auth);
    const payload = validateBody(
      createMensagemSchema,
      parseRequestBody(event.body),
    );

    const mensagem = await createMensagemService(requester, payload);

    return sendSuccessResponse(mensagem, STATUS_CODE.CREATED);
  }),
);
