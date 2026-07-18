import { APIGatewayProxyResult } from "aws-lambda";
import { withErrorHandling } from "../../middlewares/errorHandler";
import { requireRole } from "../../middlewares/roleGuard";
import { getPagamentoStatusService } from "../../services/pagamentos/getPagamentoStatus";
import { resolveRequester } from "../../utils/requester";
import { sendSuccessResponse } from "../../utils/http";

export const execute = withErrorHandling(
  requireRole("responsavel")(async (event, auth): Promise<APIGatewayProxyResult> => {
    const requester = await resolveRequester(auth);

    const pagamento = await getPagamentoStatusService(
      requester,
      event.pathParameters.txid,
    );

    return sendSuccessResponse(pagamento);
  }),
);
