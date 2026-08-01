import { APIGatewayProxyResult } from "aws-lambda";
import { withErrorHandling } from "../../middlewares/errorHandler";
import { requireRole } from "../../middlewares/roleGuard";
import { parseRequestBody, validateBody } from "../../middlewares/validate";
import { dispararCobrancasSchema } from "../../schemas/financeiro/dispararCobrancas.schema";
import { dispararCobrancasService } from "../../services/financeiro/dispararCobrancas";
import { sendSuccessResponse } from "../../utils/http";

export const execute = withErrorHandling(
  requireRole("admin")(async (event): Promise<APIGatewayProxyResult> => {
    const payload = validateBody(
      dispararCobrancasSchema,
      parseRequestBody(event.body),
    );

    const resultado = await dispararCobrancasService(
      "manual",
      payload.dryRun ?? false,
    );

    return sendSuccessResponse(resultado);
  }),
);
