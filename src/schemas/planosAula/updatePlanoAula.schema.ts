import { JSONSchemaType } from "ajv";
import { IUpdatePlanoAulaPayload } from "../../types/planosAula";

export const updatePlanoAulaSchema: JSONSchemaType<IUpdatePlanoAulaPayload> = {
  type: "object",
  properties: {
    turmaId: { type: "string", minLength: 1, nullable: true },
    titulo: { type: "string", minLength: 3, nullable: true },
    descricao: { type: "string", minLength: 1, nullable: true },
    data: { type: "string", format: "date", nullable: true },
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
  required: [],
  additionalProperties: false,
};
