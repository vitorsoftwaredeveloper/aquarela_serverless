import { APIGatewayProxyResult } from "aws-lambda";
import { withErrorHandling } from "../../middlewares/errorHandler";
import { requireRole } from "../../middlewares/roleGuard";
import { parseRequestBody, validateBody } from "../../middlewares/validate";
import { updateProfessorSchema } from "../../schemas/professores/updateProfessor.schema";
import { updateProfessorService } from "../../services/professores/updateProfessor";
import { resolveRequester } from "../../utils/requester";
import { sendSuccessResponse } from "../../utils/http";

export const execute = withErrorHandling(
  requireRole(
    "admin",
    "professor",
  )(async (event, auth): Promise<APIGatewayProxyResult> => {
    const requester = await resolveRequester(auth);
    const payload = validateBody(
      updateProfessorSchema,
      parseRequestBody(event.body),
    );

    const professor = await updateProfessorService(
      requester,
      event.pathParameters.id,
      payload,
    );

    return sendSuccessResponse(professor);
  }),
);
