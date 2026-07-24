import { APIGatewayProxyResult } from "aws-lambda";
import { withErrorHandling } from "../../middlewares/errorHandler";
import { requireRole } from "../../middlewares/roleGuard";
import { parseRequestBody, validateBody } from "../../middlewares/validate";
import { updateAvisoSchema } from "../../schemas/avisos/updateAviso.schema";
import { updateAvisoService } from "../../services/avisos/updateAviso";
import { sendSuccessResponse } from "../../utils/http";

export const execute = withErrorHandling(
  requireRole("admin")(async (event): Promise<APIGatewayProxyResult> => {
    const payload = validateBody(
      updateAvisoSchema,
      parseRequestBody(event.body),
    );

    const aviso = await updateAvisoService(event.pathParameters.id, payload);

    return sendSuccessResponse(aviso);
  }),
);
