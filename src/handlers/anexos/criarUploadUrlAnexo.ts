import { APIGatewayProxyResult } from "aws-lambda";
import { withErrorHandling } from "../../middlewares/errorHandler";
import { requireRole } from "../../middlewares/roleGuard";
import { parseRequestBody, validateBody } from "../../middlewares/validate";
import { criarUploadUrlAnexoSchema } from "../../schemas/anexos/criarUploadUrlAnexo.schema";
import { criarUploadUrlAnexoService } from "../../services/anexos/criarUploadUrlAnexo";
import { sendSuccessResponse } from "../../utils/http";
import { STATUS_CODE } from "../../utils/errors";

export const execute = withErrorHandling(
  requireRole(
    "admin",
    "professor",
    "responsavel",
  )(async (event): Promise<APIGatewayProxyResult> => {
    const payload = validateBody(
      criarUploadUrlAnexoSchema,
      parseRequestBody(event.body),
    );

    const resultado = await criarUploadUrlAnexoService(payload);

    return sendSuccessResponse(resultado, STATUS_CODE.CREATED);
  }),
);
