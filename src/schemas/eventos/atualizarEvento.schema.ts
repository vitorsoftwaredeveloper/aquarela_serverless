import { JSONSchemaType } from "ajv";
import { IUpdateEventoPayload } from "../../types/eventos";

export const atualizarEventoSchema: JSONSchemaType<IUpdateEventoPayload> = {
  type: "object",
  properties: {
    titulo: { type: "string", minLength: 3, nullable: true },
    descricao: { type: "string", nullable: true },
    data: { type: "string", format: "date", nullable: true },
    turmaId: { type: "string", minLength: 1, nullable: true },
  },
  required: [],
  additionalProperties: false,
};
