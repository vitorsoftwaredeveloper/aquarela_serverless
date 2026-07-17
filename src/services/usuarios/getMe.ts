import { AuthClaims } from "../../types/auth";
import { IUsuario } from "../../types/usuarios";
import { resolveRequester } from "../../utils/requester";

export const getMeService = async (auth: AuthClaims): Promise<IUsuario> =>
  resolveRequester(auth);
