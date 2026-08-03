import { APIGatewayProxyResult } from "aws-lambda";
import { withErrorHandling } from "../../middlewares/errorHandler";
import { requireRole } from "../../middlewares/roleGuard";
import { getFrequenciaAgendaService } from "../../services/agendas/getFrequenciaAgenda";
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

    if (!query.criancaId || !query.de || !query.ate) {
      throw httpError(
        STATUS_CODE.BAD_REQUEST,
        "BAD_REQUEST",
        "Parâmetros criancaId, de e ate são obrigatórios.",
      );
    }

    const frequencia = await getFrequenciaAgendaService(
      requester,
      query.criancaId,
      query.de,
      query.ate,
    );

    return sendSuccessResponse(frequencia);
  }),
);
