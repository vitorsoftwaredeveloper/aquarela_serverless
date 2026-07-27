import { JSONSchemaType } from "ajv";
import { IUpdateProfessorPayload } from "../../types/professores";
import { fotoUploadSchema } from "./foto.schema";

export const updateProfessorSchema: JSONSchemaType<IUpdateProfessorPayload> = {
  type: "object",
  properties: {
    nome: { type: "string", minLength: 3, nullable: true },
    telefone: { type: "string", minLength: 8, nullable: true },
    email: { type: "string", format: "email", nullable: true },
    formacao: { type: "string", nullable: true },
    foto: { ...fotoUploadSchema, nullable: true },
  },
  required: [],
  additionalProperties: false,
};
