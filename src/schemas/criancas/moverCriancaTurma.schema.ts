import { JSONSchemaType } from "ajv";

export interface IMoverCriancaTurmaPayload {
  turmaId: string;
}

export const moverCriancaTurmaSchema: JSONSchemaType<IMoverCriancaTurmaPayload> = {
  type: "object",
  properties: {
    turmaId: { type: "string", minLength: 1 },
  },
  required: ["turmaId"],
  additionalProperties: false,
};
