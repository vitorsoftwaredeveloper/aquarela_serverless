import { APIGatewayProxyResult } from "aws-lambda";
import { withErrorHandling } from "../../middlewares/errorHandler";
import { listPlanosService } from "../../services/configPrecos/listPlanos";
import { sendSuccessResponse } from "../../utils/http";

export const execute = withErrorHandling(
  async (_event): Promise<APIGatewayProxyResult> => {
    const planos = await listPlanosService();
    return sendSuccessResponse({ planos });
  },
);
