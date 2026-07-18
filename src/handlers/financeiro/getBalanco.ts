import { APIGatewayProxyResult } from "aws-lambda";
import { withErrorHandling } from "../../middlewares/errorHandler";
import { requireRole } from "../../middlewares/roleGuard";
import { getBalancoService } from "../../services/financeiro/getBalanco";
import { sendSuccessResponse } from "../../utils/http";

export const execute = withErrorHandling(
  requireRole("admin")(async (event): Promise<APIGatewayProxyResult> => {
    const query = event.queryStringParameters ?? {};

    const balanco = await getBalancoService(query.periodo);

    return sendSuccessResponse(balanco);
  }),
);
