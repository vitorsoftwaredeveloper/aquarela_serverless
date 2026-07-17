import { APIGatewayProxyResult } from "aws-lambda";
import { withErrorHandling } from "../../middlewares/errorHandler";
import { requireRole } from "../../middlewares/roleGuard";
import { parseRequestBody, validateBody } from "../../middlewares/validate";
import { updateTurmaSchema } from "../../schemas/turmas/updateTurma.schema";
import { updateTurmaService } from "../../services/turmas/updateTurma";
import { sendSuccessResponse } from "../../utils/http";

export const execute = withErrorHandling(
  requireRole("admin")(async (event): Promise<APIGatewayProxyResult> => {
    const payload = validateBody(
      updateTurmaSchema,
      parseRequestBody(event.body),
    );

    const turma = await updateTurmaService(event.pathParameters.id, payload);

    return sendSuccessResponse(turma);
  }),
);
