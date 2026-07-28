import { JSONSchemaType } from "ajv";
import { IRegistrarDispositivoPayload } from "../../types/dispositivos";

export const registrarDispositivoSchema: JSONSchemaType<IRegistrarDispositivoPayload> = {
  type: "object",
  properties: {
    token: { type: "string", minLength: 10 },
    plataforma: { type: "string", enum: ["android", "ios", "web", "desktop"] },
  },
  required: ["token", "plataforma"],
  additionalProperties: false,
};
