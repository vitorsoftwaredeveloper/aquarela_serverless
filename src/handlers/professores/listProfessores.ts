import { APIGatewayProxyResult } from "aws-lambda";
import { withErrorHandling } from "../../middlewares/errorHandler";
import { requireRole } from "../../middlewares/roleGuard";
import { listProfessoresService } from "../../services/professores/listProfessores";
import { sendSuccessResponse } from "../../utils/http";

export const execute = withErrorHandling(
  requireRole("admin")(async (event): Promise<APIGatewayProxyResult> => {
    const query = event.queryStringParameters ?? {};

    const professores = await listProfessoresService({
      ativo: query.ativo !== undefined ? query.ativo === "true" : undefined,
    });

    return sendSuccessResponse(professores);
  }),
);
