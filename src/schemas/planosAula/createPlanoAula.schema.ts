import { JSONSchemaType } from "ajv";
import { ICreatePlanoAulaPayload } from "../../types/planosAula";

export const createPlanoAulaSchema: JSONSchemaType<ICreatePlanoAulaPayload> = {
  type: "object",
  properties: {
    turmaId: { type: "string", minLength: 1 },
    titulo: { type: "string", minLength: 3 },
    descricao: { type: "string", minLength: 1 },
    data: { type: "string", format: "date" },
    objetivos: {
      type: "array",
      items: { type: "string", minLength: 1 },
      nullable: true,
    },
    materiais: {
      type: "array",
      items: { type: "string", minLength: 1 },
      nullable: true,
    },
  },
  required: ["turmaId", "titulo", "descricao", "data"],
  additionalProperties: false,
};
