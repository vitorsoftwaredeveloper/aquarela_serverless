import { APIGatewayProxyResult } from "aws-lambda";
import { withErrorHandling } from "../../middlewares/errorHandler";
import { requireRole } from "../../middlewares/roleGuard";
import { listProfessoresService } from "../../services/professores/listProfessores";
import { sendSuccessResponse } from "../../utils/http";

export const execute = withErrorHandling(
  requireRole("admin")(async (): Promise<APIGatewayProxyResult> => {
    const professores = await listProfessoresService();

    return sendSuccessResponse(professores);
  }),
);
