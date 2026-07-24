import { JSONSchemaType } from "ajv";
import { ICreateAvisoPayload } from "../../types/avisos";

export const createAvisoSchema: JSONSchemaType<ICreateAvisoPayload> = {
  type: "object",
  properties: {
    titulo: { type: "string", minLength: 3 },
    corpo: { type: "string", minLength: 1 },
    turmaId: { type: "string", minLength: 1, nullable: true },
  },
  required: ["titulo", "corpo"],
  additionalProperties: false,
};
