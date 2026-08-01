import { APIGatewayProxyResult } from "aws-lambda";
import { withErrorHandling } from "../../middlewares/errorHandler";
import { requireRole } from "../../middlewares/roleGuard";
import { listMensagensService } from "../../services/mensagens/listMensagens";
import { resolveRequester } from "../../utils/requester";
import { sendSuccessResponse } from "../../utils/http";
import { httpError, STATUS_CODE } from "../../utils/errors";

export const execute = withErrorHandling(
  requireRole(
    "admin",
    "professor",
    "responsavel",
  )(async (event, auth): Promise<APIGatewayProxyResult> => {
    const requester = await resolveRequester(auth);
    const query = event.queryStringParameters ?? {};

    if (!query.criancaId) {
      throw httpError(
        STATUS_CODE.BAD_REQUEST,
        "BAD_REQUEST",
        "Parâmetro criancaId é obrigatório.",
      );
    }

    const mensagens = await listMensagensService(requester, {
      criancaId: query.criancaId,
      limit: query.limit ? Number(query.limit) : undefined,
      antesDe: query.antesDe,
    });

    return sendSuccessResponse(mensagens);
  }),
);
