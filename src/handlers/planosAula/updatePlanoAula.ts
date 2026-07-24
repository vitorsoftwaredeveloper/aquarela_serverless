import { APIGatewayProxyResult } from "aws-lambda";
import { withErrorHandling } from "../../middlewares/errorHandler";
import { requireRole } from "../../middlewares/roleGuard";
import { parseRequestBody, validateBody } from "../../middlewares/validate";
import { updatePlanoAulaSchema } from "../../schemas/planosAula/updatePlanoAula.schema";
import { updatePlanoAulaService } from "../../services/planosAula/updatePlanoAula";
import { resolveRequester } from "../../utils/requester";
import { sendSuccessResponse } from "../../utils/http";

export const execute = withErrorHandling(
  requireRole(
    "admin",
    "professor",
  )(async (event, auth): Promise<APIGatewayProxyResult> => {
    const requester = await resolveRequester(auth);
    const payload = validateBody(
      updatePlanoAulaSchema,
      parseRequestBody(event.body),
    );

    const planoAula = await updatePlanoAulaService(
      requester,
      event.pathParameters.id,
      payload,
    );

    return sendSuccessResponse(planoAula);
  }),
);
