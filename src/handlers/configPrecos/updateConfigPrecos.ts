import { APIGatewayProxyResult } from "aws-lambda";
import { withErrorHandling } from "../../middlewares/errorHandler";
import { requireRole } from "../../middlewares/roleGuard";
import { parseRequestBody, validateBody } from "../../middlewares/validate";
import { updateConfigPrecosSchema } from "../../schemas/configPrecos/updateConfigPrecos.schema";
import { updateConfigPrecosService } from "../../services/configPrecos/updateConfigPrecos";
import { resolveRequester } from "../../utils/requester";
import { sendSuccessResponse } from "../../utils/http";

export const execute = withErrorHandling(
  requireRole("admin")(async (event, auth): Promise<APIGatewayProxyResult> => {
    const requester = await resolveRequester(auth);
    const payload = validateBody(
      updateConfigPrecosSchema,
      parseRequestBody(event.body),
    );

    const config = await updateConfigPrecosService(requester, payload);

    return sendSuccessResponse(config);
  }),
);
