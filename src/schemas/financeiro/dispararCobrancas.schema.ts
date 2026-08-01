import { JSONSchemaType } from "ajv";

export interface IDispararCobrancasPayload {
  dryRun?: boolean;
}

export const dispararCobrancasSchema: JSONSchemaType<IDispararCobrancasPayload> = {
  type: "object",
  properties: {
    dryRun: { type: "boolean", nullable: true },
  },
  additionalProperties: false,
};
