import { APIGatewayProxyResult } from "aws-lambda";
import { withErrorHandling } from "../../middlewares/errorHandler";
import { requireRole } from "../../middlewares/roleGuard";
import { getUsuarioByIdService } from "../../services/usuarios/getUsuarioById";
import { sendSuccessResponse } from "../../utils/http";

export const execute = withErrorHandling(
  requireRole("admin")(async (event): Promise<APIGatewayProxyResult> => {
    const usuario = await getUsuarioByIdService(event.pathParameters.id);
    return sendSuccessResponse(usuario);
  }),
);
