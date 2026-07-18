import { JSONSchemaType } from "ajv";
import { ICreatePagamentoPayload } from "../../types/pagamentos";

export const createPagamentoSchema: JSONSchemaType<ICreatePagamentoPayload> = {
  type: "object",
  properties: {
    mensalidadeId: { type: "string", minLength: 1 },
  },
  required: ["mensalidadeId"],
  additionalProperties: false,
};
