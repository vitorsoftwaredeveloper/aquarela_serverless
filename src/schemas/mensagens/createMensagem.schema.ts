import { JSONSchemaType } from "ajv";
import { ICreateMensagemPayload } from "../../types/mensagens";

const anexoSchema = {
  type: "object",
  properties: {
    key: { type: "string", minLength: 1 },
    nome: { type: "string", minLength: 1 },
    contentType: { type: "string", minLength: 1 },
    tamanho: { type: "number", exclusiveMinimum: 0 },
  },
  required: ["key", "nome", "contentType", "tamanho"],
  additionalProperties: false,
} as const;

export const createMensagemSchema: JSONSchemaType<ICreateMensagemPayload> = {
  type: "object",
  properties: {
    criancaId: { type: "string", minLength: 1 },
    corpo: { type: "string", minLength: 1, maxLength: 2000 },
    anexos: {
      type: "array",
      items: anexoSchema,
      maxItems: 5,
      nullable: true,
    },
  },
  required: ["criancaId", "corpo"],
  additionalProperties: false,
};
