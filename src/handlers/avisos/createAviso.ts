import { APIGatewayProxyResult } from "aws-lambda";
import { withErrorHandling } from "../../middlewares/errorHandler";
import { requireRole } from "../../middlewares/roleGuard";
import { parseRequestBody, validateBody } from "../../middlewares/validate";
import { createAvisoSchema } from "../../schemas/avisos/createAviso.schema";
import { createAvisoService } from "../../services/avisos/createAviso";
import { resolveRequester } from "../../utils/requester";
import { sendSuccessResponse } from "../../utils/http";
import { STATUS_CODE } from "../../utils/errors";

export const execute = withErrorHandling(
  requireRole("admin")(async (event, auth): Promise<APIGatewayProxyResult> => {
    const requester = await resolveRequester(auth);
    const payload = validateBody(
      createAvisoSchema,
      parseRequestBody(event.body),
    );

    const aviso = await createAvisoService(requester, payload);

    return sendSuccessResponse(aviso, STATUS_CODE.CREATED);
  }),
);
