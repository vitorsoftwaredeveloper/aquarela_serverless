import { APIGatewayProxyResult } from "aws-lambda";
import { withErrorHandling } from "../../middlewares/errorHandler";
import { requireRole } from "../../middlewares/roleGuard";
import { parseRequestBody, validateBody } from "../../middlewares/validate";
import { updateDespesaSchema } from "../../schemas/despesas/updateDespesa.schema";
import { updateDespesaService } from "../../services/despesas/updateDespesa";
import { sendSuccessResponse } from "../../utils/http";

export const execute = withErrorHandling(
  requireRole("admin")(async (event): Promise<APIGatewayProxyResult> => {
    const payload = validateBody(
      updateDespesaSchema,
      parseRequestBody(event.body),
    );

    const despesa = await updateDespesaService(
      event.pathParameters.id,
      payload,
    );

    return sendSuccessResponse(despesa);
  }),
);
