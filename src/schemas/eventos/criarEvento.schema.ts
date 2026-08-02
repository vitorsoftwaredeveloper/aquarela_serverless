import { JSONSchemaType } from "ajv";
import { ICreateEventoPayload } from "../../types/eventos";

export const criarEventoSchema: JSONSchemaType<ICreateEventoPayload> = {
  type: "object",
  properties: {
    titulo: { type: "string", minLength: 3 },
    descricao: { type: "string", nullable: true },
    data: { type: "string", format: "date" },
    turmaId: { type: "string", minLength: 1, nullable: true },
  },
  required: ["titulo", "data"],
  additionalProperties: false,
};
