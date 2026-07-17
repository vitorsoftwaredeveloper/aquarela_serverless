import { APIGatewayProxyResult } from "aws-lambda";
import { withErrorHandling } from "../../middlewares/errorHandler";
import { requireRole } from "../../middlewares/roleGuard";
import { parseRequestBody, validateBody } from "../../middlewares/validate";
import { updateUsuarioSchema } from "../../schemas/usuarios/updateUsuario.schema";
import { updateUsuarioService } from "../../services/usuarios/updateUsuario";
import { sendSuccessResponse } from "../../utils/http";

export const execute = withErrorHandling(
  requireRole("admin")(async (event): Promise<APIGatewayProxyResult> => {
    const payload = validateBody(
      updateUsuarioSchema,
      parseRequestBody(event.body),
    );

    const usuario = await updateUsuarioService(
      event.pathParameters.id,
      payload,
    );

    return sendSuccessResponse(usuario);
  }),
);
