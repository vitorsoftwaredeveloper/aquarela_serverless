import { APIGatewayProxyResult } from "aws-lambda";
import { withErrorHandling } from "../../middlewares/errorHandler";
import { requireRole } from "../../middlewares/roleGuard";
import { listCriancasService } from "../../services/criancas/listCriancas";
import { resolveRequester } from "../../utils/requester";
import { sendSuccessResponse } from "../../utils/http";

export const execute = withErrorHandling(
  requireRole("admin", "professor", "responsavel")(async (event, auth): Promise<APIGatewayProxyResult> => {
    const requester = await resolveRequester(auth);
    const query = event.queryStringParameters ?? {};

    const criancas = await listCriancasService(requester, {
      turmaId: query.turmaId,
      nome: query.nome,
    });

    return sendSuccessResponse(criancas);
  }),
);
