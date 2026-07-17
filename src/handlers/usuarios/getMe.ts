import { APIGatewayProxyResult } from "aws-lambda";
import { withErrorHandling } from "../../middlewares/errorHandler";
import { requireRole } from "../../middlewares/roleGuard";
import { getMeService } from "../../services/usuarios/getMe";
import { sendSuccessResponse } from "../../utils/http";

export const execute = withErrorHandling(
  requireRole("admin", "professor", "responsavel")(
    async (_event, auth): Promise<APIGatewayProxyResult> => {
      const usuario = await getMeService(auth);
      return sendSuccessResponse(usuario);
    },
  ),
);
