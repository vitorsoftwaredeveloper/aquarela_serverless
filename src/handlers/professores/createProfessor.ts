import { APIGatewayProxyResult } from "aws-lambda";
import { withErrorHandling } from "../../middlewares/errorHandler";
import { requireRole } from "../../middlewares/roleGuard";
import { parseRequestBody, validateBody } from "../../middlewares/validate";
import { createProfessorSchema } from "../../schemas/professores/createProfessor.schema";
import { createProfessorService } from "../../services/professores/createProfessor";
import { sendSuccessResponse } from "../../utils/http";
import { STATUS_CODE } from "../../utils/errors";

export const execute = withErrorHandling(
  requireRole("admin")(async (event): Promise<APIGatewayProxyResult> => {
    const payload = validateBody(
      createProfessorSchema,
      parseRequestBody(event.body),
    );

    const professor = await createProfessorService(payload);

    return sendSuccessResponse(professor, STATUS_CODE.CREATED);
  }),
);
