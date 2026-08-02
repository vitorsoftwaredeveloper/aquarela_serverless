import { APIGatewayProxyResult } from "aws-lambda";
import { withErrorHandling } from "../../middlewares/errorHandler";
import { requireRole } from "../../middlewares/roleGuard";
import { listEventosService } from "../../services/eventos/listEventos";
import { resolveRequester } from "../../utils/requester";
import { sendSuccessResponse } from "../../utils/http";

export const execute = withErrorHandling(
  requireRole(
    "admin",
    "professor",
    "responsavel",
  )(async (event, auth): Promise<APIGatewayProxyResult> => {
    const requester = await resolveRequester(auth);
    const query = event.queryStringParameters ?? {};

    const eventos = await listEventosService(requester, {
      turmaId: query.turmaId,
      ano: query.ano ? Number(query.ano) : undefined,
    });

    return sendSuccessResponse(eventos);
  }),
);
