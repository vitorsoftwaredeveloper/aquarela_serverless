import { APIGatewayProxyResult } from "aws-lambda";
import { withErrorHandling } from "../../middlewares/errorHandler";
import { simularMensalidadeService } from "../../services/simulador/simularMensalidade";
import { sendSuccessResponse } from "../../utils/http";
import { httpError, STATUS_CODE } from "../../utils/errors";

export const execute = withErrorHandling(
  async (event): Promise<APIGatewayProxyResult> => {
    const query = event.queryStringParameters ?? {};

    if (!query.plano || !query.meses) {
      throw httpError(
        STATUS_CODE.BAD_REQUEST,
        "BAD_REQUEST",
        "Parâmetros plano e meses são obrigatórios.",
      );
    }

    const meses = Number(query.meses);
    if (!Number.isInteger(meses) || meses < 1) {
      throw httpError(
        STATUS_CODE.BAD_REQUEST,
        "BAD_REQUEST",
        "Parâmetro meses deve ser um inteiro positivo.",
      );
    }

    const resultado = await simularMensalidadeService(query.plano, meses);

    return sendSuccessResponse(resultado);
  },
);
