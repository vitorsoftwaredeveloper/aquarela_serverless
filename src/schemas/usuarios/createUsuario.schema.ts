import { JSONSchemaType } from "ajv";
import { ICreateUsuarioPayload } from "../../types/usuarios";

export const createUsuarioSchema: JSONSchemaType<ICreateUsuarioPayload> = {
  type: "object",
  properties: {
    nome: { type: "string", minLength: 3 },
    email: { type: "string", format: "email" },
    papel: { type: "string", enum: ["admin", "professor", "responsavel"] },
    telefone: { type: "string", nullable: true },
  },
  required: ["nome", "email", "papel"],
  additionalProperties: false,
};
