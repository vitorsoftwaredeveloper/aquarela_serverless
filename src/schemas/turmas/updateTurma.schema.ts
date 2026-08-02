import { JSONSchemaType } from "ajv";
import { IUpdateTurmaPayload } from "../../types/turmas";

export const updateTurmaSchema: JSONSchemaType<IUpdateTurmaPayload> = {
  type: "object",
  properties: {
    nome: { type: "string", minLength: 2, nullable: true },
    descricao: { type: "string", nullable: true },
    faixaEtaria: {
      type: "object",
      properties: {
        min: { type: "number", minimum: 0 },
        max: { type: "number", minimum: 0 },
      },
      required: ["min", "max"],
      additionalProperties: false,
      nullable: true,
    },
    professorIds: {
      type: "array",
      items: { type: "string", minLength: 1 },
      minItems: 1,
      nullable: true,
    },
    capacidade: { type: "number", minimum: 1, nullable: true },
  },
  required: [],
  additionalProperties: false,
};
