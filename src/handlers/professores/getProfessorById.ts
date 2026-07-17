import { APIGatewayProxyResult } from "aws-lambda";
import { withErrorHandling } from "../../middlewares/errorHandler";
import { requireRole } from "../../middlewares/roleGuard";
import { getProfessorByIdService } from "../../services/professores/getProfessorById";
import { sendSuccessResponse } from "../../utils/http";

export const execute = withErrorHandling(
  requireRole("admin")(async (event): Promise<APIGatewayProxyResult> => {
    const professor = await getProfessorByIdService(event.pathParameters.id);
    return sendSuccessResponse(professor);
  }),
);
