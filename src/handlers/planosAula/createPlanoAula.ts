import { APIGatewayProxyResult } from "aws-lambda";
import { withErrorHandling } from "../../middlewares/errorHandler";
import { requireRole } from "../../middlewares/roleGuard";
import { parseRequestBody, validateBody } from "../../middlewares/validate";
import { createPlanoAulaSchema } from "../../schemas/planosAula/createPlanoAula.schema";
import { createPlanoAulaService } from "../../services/planosAula/createPlanoAula";
import { resolveRequester } from "../../utils/requester";
import { sendSuccessResponse } from "../../utils/http";
import { STATUS_CODE } from "../../utils/errors";

export const execute = withErrorHandling(
  requireRole(
    "admin",
    "professor",
  )(async (event, auth): Promise<APIGatewayProxyResult> => {
    const requester = await resolveRequester(auth);
    const payload = validateBody(
      createPlanoAulaSchema,
      parseRequestBody(event.body),
    );

    const planoAula = await createPlanoAulaService(requester, payload);

    return sendSuccessResponse(planoAula, STATUS_CODE.CREATED);
  }),
);
