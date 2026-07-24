import { JSONSchemaType } from "ajv";
import { ICreateProfessorPayload } from "../../types/professores";

export const createProfessorSchema: JSONSchemaType<ICreateProfessorPayload> = {
  type: "object",
  properties: {
    nome: { type: "string", minLength: 3 },
    cpf: { type: "string", minLength: 11, maxLength: 14 },
    telefone: { type: "string", minLength: 8 },
    email: { type: "string", format: "email" },
    formacao: { type: "string", nullable: true },
  },
  required: ["nome", "cpf", "telefone", "email"],
  additionalProperties: false,
};
