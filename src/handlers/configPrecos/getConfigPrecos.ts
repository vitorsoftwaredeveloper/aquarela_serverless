import { APIGatewayProxyResult } from "aws-lambda";
import { withErrorHandling } from "../../middlewares/errorHandler";
import { requireRole } from "../../middlewares/roleGuard";
import { getConfigPrecosService } from "../../services/configPrecos/getConfigPrecos";
import { sendSuccessResponse } from "../../utils/http";

export const execute = withErrorHandling(
  requireRole("admin")(async (_event): Promise<APIGatewayProxyResult> => {
    const config = await getConfigPrecosService();
    return sendSuccessResponse(config);
  }),
);
