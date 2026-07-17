import { JSONSchemaType } from "ajv";

export interface IVincularCriancaPayload {
  criancaId: string;
}

export const vincularCriancaSchema: JSONSchemaType<IVincularCriancaPayload> = {
  type: "object",
  properties: {
    criancaId: { type: "string", minLength: 1 },
  },
  required: ["criancaId"],
  additionalProperties: false,
};
