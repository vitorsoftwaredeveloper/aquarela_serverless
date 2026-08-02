import { JSONSchemaType } from "ajv";
import { IAtualizarFotosPayload } from "../../types/eventos";

const fotoAtualizacaoSchema = {
  type: "object",
  properties: {
    key: { type: "string", minLength: 1 },
    legenda: { type: "string", nullable: true },
    ordem: { type: "number", minimum: 0 },
  },
  required: ["key", "ordem"],
  additionalProperties: false,
} as const;

export const atualizarFotosEventoSchema: JSONSchemaType<IAtualizarFotosPayload> =
  {
    type: "object",
    properties: {
      fotos: {
        type: "array",
        items: fotoAtualizacaoSchema,
        minItems: 1,
        maxItems: 50,
      },
    },
    required: ["fotos"],
    additionalProperties: false,
  };
