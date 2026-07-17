import { APIGatewayProxyResult } from "aws-lambda";
import { withErrorHandling } from "../../middlewares/errorHandler";
import { requireRole } from "../../middlewares/roleGuard";
import { listUsuariosService } from "../../services/usuarios/listUsuarios";
import { sendSuccessResponse } from "../../utils/http";
import { Role } from "../../types/auth";

export const execute = withErrorHandling(
  requireRole("admin")(async (event): Promise<APIGatewayProxyResult> => {
    const query = event.queryStringParameters ?? {};

    const usuarios = await listUsuariosService({
      papel: query.papel as Role | undefined,
      ativo: query.ativo !== undefined ? query.ativo === "true" : undefined,
    });

    return sendSuccessResponse(usuarios);
  }),
);
