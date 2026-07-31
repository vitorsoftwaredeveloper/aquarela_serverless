import { JSONSchemaType } from "ajv";
import { IRedefinirSenhaPayload } from "../../types/usuarios";

export const redefinirSenhaSchema: JSONSchemaType<IRedefinirSenhaPayload> = {
  type: "object",
  properties: {
    novaSenha: { type: "string", minLength: 8 },
  },
  required: ["novaSenha"],
  additionalProperties: false,
};
