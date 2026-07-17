import { APIGatewayProxyResult } from "aws-lambda";
import { withErrorHandling } from "../../middlewares/errorHandler";
import { requireRole } from "../../middlewares/roleGuard";
import { parseRequestBody, validateBody } from "../../middlewares/validate";
import { createUsuarioSchema } from "../../schemas/usuarios/createUsuario.schema";
import { createUsuarioService } from "../../services/usuarios/createUsuario";
import { sendSuccessResponse } from "../../utils/http";
import { STATUS_CODE } from "../../utils/errors";

export const execute = withErrorHandling(
  requireRole("admin")(async (event): Promise<APIGatewayProxyResult> => {
    const payload = validateBody(
      createUsuarioSchema,
      parseRequestBody(event.body),
    );

    const usuario = await createUsuarioService(payload);

    return sendSuccessResponse(usuario, STATUS_CODE.CREATED);
  }),
);
