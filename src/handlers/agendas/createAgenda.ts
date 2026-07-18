import { APIGatewayProxyResult } from "aws-lambda";
import { withErrorHandling } from "../../middlewares/errorHandler";
import { requireRole } from "../../middlewares/roleGuard";
import { parseRequestBody, validateBody } from "../../middlewares/validate";
import { createAgendaSchema } from "../../schemas/agendas/createAgenda.schema";
import { createAgendaService } from "../../services/agendas/createAgenda";
import { resolveRequester } from "../../utils/requester";
import { sendSuccessResponse } from "../../utils/http";
import { STATUS_CODE } from "../../utils/errors";

export const execute = withErrorHandling(
  requireRole("professor")(async (event, auth): Promise<APIGatewayProxyResult> => {
    const requester = await resolveRequester(auth);
    const payload = validateBody(
      createAgendaSchema,
      parseRequestBody(event.body),
    );

    const agenda = await createAgendaService(requester, payload);

    return sendSuccessResponse(agenda, STATUS_CODE.CREATED);
  }),
);
