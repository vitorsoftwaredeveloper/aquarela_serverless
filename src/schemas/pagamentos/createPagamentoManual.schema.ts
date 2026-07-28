import { JSONSchemaType } from "ajv";
import { ICreatePagamentoManualPayload } from "../../types/pagamentos";

export const createPagamentoManualSchema: JSONSchemaType<ICreatePagamentoManualPayload> = {
  type: "object",
  properties: {
    mensalidadeId: { type: "string", minLength: 1 },
    valor: { type: "number", exclusiveMinimum: 0 },
  },
  required: ["mensalidadeId", "valor"],
  additionalProperties: false,
};
