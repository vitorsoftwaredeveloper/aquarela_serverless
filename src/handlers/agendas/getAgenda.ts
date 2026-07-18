import { APIGatewayProxyResult } from "aws-lambda";
import { withErrorHandling } from "../../middlewares/errorHandler";
import { requireRole } from "../../middlewares/roleGuard";
import { getAgendaService } from "../../services/agendas/getAgenda";
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

    if (!query.criancaId || !query.data) {
      throw httpError(
        STATUS_CODE.BAD_REQUEST,
        "BAD_REQUEST",
        "Parâmetros criancaId e data são obrigatórios.",
      );
    }

    const agenda = await getAgendaService(
      requester,
      query.criancaId,
      query.data,
    );

    return sendSuccessResponse(agenda);
  }),
);
