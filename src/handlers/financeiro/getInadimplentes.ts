import { APIGatewayProxyResult } from "aws-lambda";
import { withErrorHandling } from "../../middlewares/errorHandler";
import { requireRole } from "../../middlewares/roleGuard";
import { getInadimplentesService } from "../../services/financeiro/getInadimplentes";
import { sendSuccessResponse } from "../../utils/http";

export const execute = withErrorHandling(
  requireRole("admin")(async (_event): Promise<APIGatewayProxyResult> => {
    const inadimplentes = await getInadimplentesService();

    return sendSuccessResponse(inadimplentes);
  }),
);
