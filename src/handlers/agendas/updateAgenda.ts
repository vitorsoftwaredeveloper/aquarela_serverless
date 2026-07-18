import { APIGatewayProxyResult } from "aws-lambda";
import { withErrorHandling } from "../../middlewares/errorHandler";
import { requireRole } from "../../middlewares/roleGuard";
import { parseRequestBody, validateBody } from "../../middlewares/validate";
import { updateAgendaSchema } from "../../schemas/agendas/updateAgenda.schema";
import { updateAgendaService } from "../../services/agendas/updateAgenda";
import { resolveRequester } from "../../utils/requester";
import { sendSuccessResponse } from "../../utils/http";

export const execute = withErrorHandling(
  requireRole("professor")(async (event, auth): Promise<APIGatewayProxyResult> => {
    const requester = await resolveRequester(auth);
    const payload = validateBody(
      updateAgendaSchema,
      parseRequestBody(event.body),
    );

    const agenda = await updateAgendaService(
      requester,
      event.pathParameters.id,
      payload,
    );

    return sendSuccessResponse(agenda);
  }),
);
