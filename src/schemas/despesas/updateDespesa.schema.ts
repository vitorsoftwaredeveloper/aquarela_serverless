import { JSONSchemaType } from "ajv";
import { IUpdateDespesaPayload } from "../../types/despesas";

export const updateDespesaSchema: JSONSchemaType<IUpdateDespesaPayload> = {
  type: "object",
  properties: {
    descricao: { type: "string", minLength: 3, nullable: true },
    categoria: { type: "string", minLength: 2, nullable: true },
    valor: { type: "number", minimum: 0, nullable: true },
    data: { type: "string", format: "date", nullable: true },
    anexoUrl: { type: "string", nullable: true },
  },
  required: [],
  additionalProperties: false,
};
