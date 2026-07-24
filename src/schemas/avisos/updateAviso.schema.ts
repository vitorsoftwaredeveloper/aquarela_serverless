import { JSONSchemaType } from "ajv";
import { IUpdateAvisoPayload } from "../../types/avisos";

export const updateAvisoSchema: JSONSchemaType<IUpdateAvisoPayload> = {
  type: "object",
  properties: {
    titulo: { type: "string", minLength: 3, nullable: true },
    corpo: { type: "string", minLength: 1, nullable: true },
    turmaId: { type: "string", minLength: 1, nullable: true },
  },
  required: [],
  additionalProperties: false,
};
