import { APIGatewayProxyResult } from "aws-lambda";
import { withErrorHandling } from "../../middlewares/errorHandler";
import { requireRole } from "../../middlewares/roleGuard";
import { getHistoricoAgendaService } from "../../services/agendas/getHistoricoAgenda";
import { resolveRequester } from "../../utils/requester";
import { sendSuccessResponse } from "../../utils/http";
import { httpError, STATUS_CODE } from "../../utils/errors";

export const execute = withErrorHandling(
  requireRole(
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

    const historico = await getHistoricoAgendaService(
      requester,
      query.criancaId,
      { de: query.de, ate: query.ate },
    );

    return sendSuccessResponse(historico);
  }),
);
