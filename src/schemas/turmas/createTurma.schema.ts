import { JSONSchemaType } from "ajv";
import { ICreateTurmaPayload } from "../../types/turmas";

export const createTurmaSchema: JSONSchemaType<ICreateTurmaPayload> = {
  type: "object",
  properties: {
    nome: { type: "string", minLength: 2 },
    descricao: { type: "string", nullable: true },
    faixaEtaria: {
      type: "object",
      properties: {
        min: { type: "number", minimum: 0 },
        max: { type: "number", minimum: 0 },
      },
      required: ["min", "max"],
      additionalProperties: false,
    },
    professorIds: {
      type: "array",
      items: { type: "string", minLength: 1 },
      minItems: 1,
    },
    capacidade: { type: "number", minimum: 1, nullable: true },
  },
  required: ["nome", "faixaEtaria", "professorIds"],
  additionalProperties: false,
};
