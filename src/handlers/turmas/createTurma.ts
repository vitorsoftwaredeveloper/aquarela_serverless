import { APIGatewayProxyResult } from "aws-lambda";
import { withErrorHandling } from "../../middlewares/errorHandler";
import { requireRole } from "../../middlewares/roleGuard";
import { parseRequestBody, validateBody } from "../../middlewares/validate";
import { createTurmaSchema } from "../../schemas/turmas/createTurma.schema";
import { createTurmaService } from "../../services/turmas/createTurma";
import { sendSuccessResponse } from "../../utils/http";
import { STATUS_CODE } from "../../utils/errors";

export const execute = withErrorHandling(
  requireRole("admin")(async (event): Promise<APIGatewayProxyResult> => {
    const payload = validateBody(
      createTurmaSchema,
      parseRequestBody(event.body),
    );

    const turma = await createTurmaService(payload);

    return sendSuccessResponse(turma, STATUS_CODE.CREATED);
  }),
);
