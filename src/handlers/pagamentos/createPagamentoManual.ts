import { APIGatewayProxyResult } from "aws-lambda";
import { withErrorHandling } from "../../middlewares/errorHandler";
import { requireRole } from "../../middlewares/roleGuard";
import { parseRequestBody, validateBody } from "../../middlewares/validate";
import { createPagamentoManualSchema } from "../../schemas/pagamentos/createPagamentoManual.schema";
import { createPagamentoManualService } from "../../services/pagamentos/createPagamentoManual";
import { resolveRequester } from "../../utils/requester";
import { sendSuccessResponse } from "../../utils/http";
import { STATUS_CODE } from "../../utils/errors";

export const execute = withErrorHandling(
  requireRole("admin")(async (event, auth): Promise<APIGatewayProxyResult> => {
    const requester = await resolveRequester(auth);
    const payload = validateBody(
      createPagamentoManualSchema,
      parseRequestBody(event.body),
    );

    const pagamento = await createPagamentoManualService(requester, payload);

    return sendSuccessResponse(pagamento, STATUS_CODE.CREATED);
  }),
);
