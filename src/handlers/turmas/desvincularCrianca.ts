import { APIGatewayProxyResult } from "aws-lambda";
import { withErrorHandling } from "../../middlewares/errorHandler";
import { requireRole } from "../../middlewares/roleGuard";
import { desvincularCriancaService } from "../../services/turmas/desvincularCrianca";
import { sendSuccessResponse } from "../../utils/http";
import { STATUS_CODE } from "../../utils/errors";

export const execute = withErrorHandling(
  requireRole("admin")(async (event): Promise<APIGatewayProxyResult> => {
    await desvincularCriancaService(
      event.pathParameters.id,
      event.pathParameters.criancaId,
    );
    return sendSuccessResponse(undefined, STATUS_CODE.NO_CONTENT);
  }),
);
