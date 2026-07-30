import { JSONSchemaType } from "ajv";
import { IUpdateUsuarioPayload } from "../../types/usuarios";

export const updateUsuarioSchema: JSONSchemaType<IUpdateUsuarioPayload> = {
  type: "object",
  properties: {
    nome: { type: "string", minLength: 3, nullable: true },
    telefone: { type: "string", nullable: true },
    papel: {
      type: "string",
      enum: ["admin", "professor", "responsavel"],
      nullable: true,
    },
  },
  required: [],
  additionalProperties: false,
};
