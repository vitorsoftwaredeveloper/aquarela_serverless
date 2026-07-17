import { APIGatewayProxyResult } from "aws-lambda";
import { withErrorHandling } from "../../middlewares/errorHandler";
import { requireRole } from "../../middlewares/roleGuard";
import { parseRequestBody, validateBody } from "../../middlewares/validate";
import { moverCriancaTurmaSchema } from "../../schemas/criancas/moverCriancaTurma.schema";
import { moverCriancaTurmaService } from "../../services/criancas/moverCriancaTurma";
import { sendSuccessResponse } from "../../utils/http";

export const execute = withErrorHandling(
  requireRole("admin")(async (event): Promise<APIGatewayProxyResult> => {
    const payload = validateBody(
      moverCriancaTurmaSchema,
      parseRequestBody(event.body),
    );

    const crianca = await moverCriancaTurmaService(
      event.pathParameters.id,
      payload.turmaId,
    );

    return sendSuccessResponse(crianca);
  }),
);
