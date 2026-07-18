import { APIGatewayProxyResult } from "aws-lambda";
import { withErrorHandling } from "../../middlewares/errorHandler";
import { requireRole } from "../../middlewares/roleGuard";
import { parseRequestBody, validateBody } from "../../middlewares/validate";
import { createPagamentoSchema } from "../../schemas/pagamentos/createPagamento.schema";
import { createPagamentoService } from "../../services/pagamentos/createPagamento";
import { resolveRequester } from "../../utils/requester";
import { sendSuccessResponse } from "../../utils/http";
import { STATUS_CODE } from "../../utils/errors";

export const execute = withErrorHandling(
  requireRole("responsavel")(async (event, auth): Promise<APIGatewayProxyResult> => {
    const requester = await resolveRequester(auth);
    const payload = validateBody(
      createPagamentoSchema,
      parseRequestBody(event.body),
    );

    const pagamento = await createPagamentoService(
      requester,
      payload.mensalidadeId,
    );

    return sendSuccessResponse(pagamento, STATUS_CODE.CREATED);
  }),
);
