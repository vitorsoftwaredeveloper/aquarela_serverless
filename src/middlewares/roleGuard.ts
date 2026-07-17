import { APIGatewayProxyResult } from "aws-lambda";
import { AuthClaims, Role } from "../types/auth";
import { requireAuthClaims } from "./auth";
import { httpError, STATUS_CODE } from "../utils/errors";

type AuthorizedHandler = (
  event: any,
  auth: AuthClaims,
) => Promise<APIGatewayProxyResult>;

/**
 * Exige um token válido e restringe o acesso aos papéis informados.
 * Ownership fina (professor só na sua turma, responsável só no próprio
 * filho) fica por conta do service, que recebe `auth` já resolvido.
 */
export const requireRole =
  (...roles: Role[]) =>
  (handler: AuthorizedHandler) =>
  async (event: any): Promise<APIGatewayProxyResult> => {
    const auth = requireAuthClaims(event);

    if (!roles.includes(auth.role)) {
      throw httpError(
        STATUS_CODE.FORBIDDEN,
        "FORBIDDEN",
        "Papel sem permissão para este recurso.",
      );
    }

    return handler(event, auth);
  };
