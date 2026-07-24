import { APIGatewayProxyResult } from "aws-lambda";
import { withErrorHandling } from "../../middlewares/errorHandler";
import { requireRole } from "../../middlewares/roleGuard";
import { parseRequestBody, validateBody } from "../../middlewares/validate";
import { createCriancaSchema } from "../../schemas/criancas/createCrianca.schema";
import { createCriancaService } from "../../services/criancas/createCrianca";
import { sendSuccessResponse } from "../../utils/http";
import { STATUS_CODE } from "../../utils/errors";

export const execute = withErrorHandling(
  requireRole("admin")(async (event): Promise<APIGatewayProxyResult> => {
    const payload = validateBody(
      createCriancaSchema,
      parseRequestBody(event.body),
    );

    const result = await createCriancaService(payload);

    return sendSuccessResponse(result, STATUS_CODE.CREATED);
  }),
);
