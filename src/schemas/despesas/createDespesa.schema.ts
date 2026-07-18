import { JSONSchemaType } from "ajv";
import { ICreateDespesaPayload } from "../../types/despesas";

export const createDespesaSchema: JSONSchemaType<ICreateDespesaPayload> = {
  type: "object",
  properties: {
    descricao: { type: "string", minLength: 3 },
    categoria: { type: "string", minLength: 2 },
    valor: { type: "number", minimum: 0 },
    data: { type: "string", format: "date" },
    anexoUrl: { type: "string", nullable: true },
  },
  required: ["descricao", "categoria", "valor", "data"],
  additionalProperties: false,
};
