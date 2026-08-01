import { JSONSchemaType } from "ajv";
import { IUpdateConfigPrecosPayload } from "../../types/configPrecos";

const descontoSchema = {
  type: "object",
  properties: {
    meses: { type: "number", minimum: 1 },
    percentual: { type: "number", minimum: 0, maximum: 100 },
  },
  required: ["meses", "percentual"],
  additionalProperties: false,
} as const;

const inadimplenciaSchema = {
  type: "object",
  properties: {
    diaCorte: { type: "number", minimum: 1, maximum: 28 },
    mesesCarencia: { type: "number", minimum: 0 },
  },
  required: ["diaCorte", "mesesCarencia"],
  additionalProperties: false,
} as const;

export const updateConfigPrecosSchema: JSONSchemaType<IUpdateConfigPrecosPayload> = {
  type: "object",
  properties: {
    planos: {
      type: "array",
      items: {
        type: "object",
        properties: {
          nome: { type: "string", minLength: 2 },
          tipo: { type: "string", enum: ["integral", "meioPeriodo"] },
          valorMensal: { type: "number", minimum: 0 },
          valorDiario: { type: "number", minimum: 0, nullable: true },
          descontos: { type: "array", items: descontoSchema, nullable: true },
        },
        required: ["nome", "tipo", "valorMensal"],
        additionalProperties: false,
      },
      minItems: 1,
    },
    inadimplencia: inadimplenciaSchema,
  },
  required: ["planos", "inadimplencia"],
  additionalProperties: false,
};
