import { APIGatewayProxyResult } from "aws-lambda";
import { withErrorHandling } from "../../middlewares/errorHandler";
import { requireRole } from "../../middlewares/roleGuard";
import { parseRequestBody, validateBody } from "../../middlewares/validate";
import { updateCriancaSchema } from "../../schemas/criancas/updateCrianca.schema";
import { updateCriancaService } from "../../services/criancas/updateCrianca";
import { resolveRequester } from "../../utils/requester";
import { sendSuccessResponse } from "../../utils/http";

export const execute = withErrorHandling(
  requireRole("admin")(async (event, auth): Promise<APIGatewayProxyResult> => {
    const requester = await resolveRequester(auth);
    const payload = validateBody(
      updateCriancaSchema,
      parseRequestBody(event.body),
    );

    const crianca = await updateCriancaService(
      requester,
      event.pathParameters.id,
      payload,
    );

    return sendSuccessResponse(crianca);
  }),
);
