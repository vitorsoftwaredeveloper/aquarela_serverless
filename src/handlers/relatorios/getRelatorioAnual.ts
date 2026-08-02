import { APIGatewayProxyResult } from "aws-lambda";
import { withErrorHandling } from "../../middlewares/errorHandler";
import { requireRole } from "../../middlewares/roleGuard";
import { getRelatorioAnualService } from "../../services/relatorios/getRelatorioAnual";
import { sendSuccessResponse } from "../../utils/http";

export const execute = withErrorHandling(
  requireRole("admin")(async (event): Promise<APIGatewayProxyResult> => {
    const query = event.queryStringParameters ?? {};

    const relatorio = await getRelatorioAnualService(query.ano);

    return sendSuccessResponse(relatorio);
  }),
);
