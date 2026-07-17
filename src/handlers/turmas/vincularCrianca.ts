import { APIGatewayProxyResult } from "aws-lambda";
import { withErrorHandling } from "../../middlewares/errorHandler";
import { requireRole } from "../../middlewares/roleGuard";
import { parseRequestBody, validateBody } from "../../middlewares/validate";
import { vincularCriancaSchema } from "../../schemas/turmas/vincularCrianca.schema";
import { vincularCriancaService } from "../../services/turmas/vincularCrianca";
import { sendSuccessResponse } from "../../utils/http";

export const execute = withErrorHandling(
  requireRole("admin")(async (event): Promise<APIGatewayProxyResult> => {
    const payload = validateBody(
      vincularCriancaSchema,
      parseRequestBody(event.body),
    );

    const crianca = await vincularCriancaService(
      event.pathParameters.id,
      payload.criancaId,
    );

    return sendSuccessResponse(crianca);
  }),
);
