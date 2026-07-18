import { APIGatewayProxyResult } from "aws-lambda";
import { withErrorHandling } from "../../middlewares/errorHandler";
import { requireRole } from "../../middlewares/roleGuard";
import { listMensalidadesService } from "../../services/mensalidades/listMensalidades";
import { resolveRequester } from "../../utils/requester";
import { sendSuccessResponse } from "../../utils/http";
import { httpError, STATUS_CODE } from "../../utils/errors";

export const execute = withErrorHandling(
  requireRole(
    "admin",
    "responsavel",
  )(async (event, auth): Promise<APIGatewayProxyResult> => {
    const requester = await resolveRequester(auth);
    const query = event.queryStringParameters ?? {};

    if (!query.criancaId) {
      throw httpError(
        STATUS_CODE.BAD_REQUEST,
        "BAD_REQUEST",
        "Parâmetro criancaId é obrigatório.",
      );
    }

    const mensalidades = await listMensalidadesService(
      requester,
      query.criancaId,
      query.ano ? Number(query.ano) : undefined,
    );

    return sendSuccessResponse(mensalidades);
  }),
);
