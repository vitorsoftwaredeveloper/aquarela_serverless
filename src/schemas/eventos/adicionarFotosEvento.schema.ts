import { JSONSchemaType } from "ajv";
import { IAdicionarFotosPayload } from "../../types/eventos";

const fotoSchema = {
  type: "object",
  properties: {
    key: { type: "string", minLength: 1 },
    nome: { type: "string", minLength: 1 },
    contentType: { type: "string", minLength: 1 },
    tamanho: { type: "number", exclusiveMinimum: 0 },
    legenda: { type: "string", nullable: true },
  },
  required: ["key", "nome", "contentType", "tamanho"],
  additionalProperties: false,
} as const;

export const adicionarFotosEventoSchema: JSONSchemaType<IAdicionarFotosPayload> =
  {
    type: "object",
    properties: {
      fotos: {
        type: "array",
        items: fotoSchema,
        minItems: 1,
        maxItems: 50,
      },
    },
    required: ["fotos"],
    additionalProperties: false,
  };
