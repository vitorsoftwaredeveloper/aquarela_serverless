import { APIGatewayProxyResult } from "aws-lambda";
import { withErrorHandling } from "../../middlewares/errorHandler";
import { requireRole } from "../../middlewares/roleGuard";
import { listDespesasService } from "../../services/despesas/listDespesas";
import { sendSuccessResponse } from "../../utils/http";

export const execute = withErrorHandling(
  requireRole("admin")(async (event): Promise<APIGatewayProxyResult> => {
    const query = event.queryStringParameters ?? {};

    const despesas = await listDespesasService({
      categoria: query.categoria,
      de: query.de,
      ate: query.ate,
    });

    return sendSuccessResponse(despesas);
  }),
);
