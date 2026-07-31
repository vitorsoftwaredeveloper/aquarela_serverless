import { APIGatewayProxyResult } from "aws-lambda";
import { withErrorHandling } from "../../middlewares/errorHandler";
import { requireRole } from "../../middlewares/roleGuard";
import { parseRequestBody, validateBody } from "../../middlewares/validate";
import { redefinirSenhaSchema } from "../../schemas/usuarios/redefinirSenha.schema";
import { redefinirSenhaUsuarioService } from "../../services/usuarios/redefinirSenhaUsuario";
import { sendSuccessResponse } from "../../utils/http";
import { STATUS_CODE } from "../../utils/errors";

export const execute = withErrorHandling(
  requireRole("admin")(async (event): Promise<APIGatewayProxyResult> => {
    const payload = validateBody(
      redefinirSenhaSchema,
      parseRequestBody(event.body),
    );

    await redefinirSenhaUsuarioService(event.pathParameters.id, payload);

    return sendSuccessResponse(undefined, STATUS_CODE.NO_CONTENT);
  }),
);
