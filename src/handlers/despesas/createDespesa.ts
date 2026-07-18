import { APIGatewayProxyResult } from "aws-lambda";
import { withErrorHandling } from "../../middlewares/errorHandler";
import { requireRole } from "../../middlewares/roleGuard";
import { parseRequestBody, validateBody } from "../../middlewares/validate";
import { createDespesaSchema } from "../../schemas/despesas/createDespesa.schema";
import { createDespesaService } from "../../services/despesas/createDespesa";
import { resolveRequester } from "../../utils/requester";
import { sendSuccessResponse } from "../../utils/http";
import { STATUS_CODE } from "../../utils/errors";

export const execute = withErrorHandling(
  requireRole("admin")(async (event, auth): Promise<APIGatewayProxyResult> => {
    const requester = await resolveRequester(auth);
    const payload = validateBody(
      createDespesaSchema,
      parseRequestBody(event.body),
    );

    const despesa = await createDespesaService(requester, payload);

    return sendSuccessResponse(despesa, STATUS_CODE.CREATED);
  }),
);
