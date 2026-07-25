import { JSONSchemaType } from "ajv";
import { IUpdateCriancaPayload } from "../../types/criancas";
import { fotoUploadSchema } from "./foto.schema";

export const updateCriancaSchema: JSONSchemaType<IUpdateCriancaPayload> = {
  type: "object",
  properties: {
    nome: { type: "string", minLength: 3, nullable: true },
    dataNascimento: { type: "string", format: "date", nullable: true },
    foto: { ...fotoUploadSchema, nullable: true },
    responsaveis: {
      type: "array",
      items: {
        type: "object",
        properties: {
          usuarioId: { type: "string", nullable: true },
          nome: { type: "string", minLength: 3 },
          cpf: { type: "string", minLength: 11, maxLength: 14 },
          parentesco: { type: "string", minLength: 2 },
          telefone: { type: "string", minLength: 8 },
          email: { type: "string", format: "email" },
          podeRetirar: { type: "boolean" },
        },
        required: ["nome", "cpf", "parentesco", "telefone", "email", "podeRetirar"],
        additionalProperties: false,
      },
      minItems: 1,
      nullable: true,
    },
    saude: {
      type: "object",
      properties: {
        alergias: { type: "array", items: { type: "string" }, nullable: true },
        restricoesAlimentares: {
          type: "array",
          items: { type: "string" },
          nullable: true,
        },
        medicacoesContinuas: {
          type: "array",
          items: {
            type: "object",
            properties: {
              nome: { type: "string" },
              dose: { type: "string" },
              horario: { type: "string" },
              observacao: { type: "string", nullable: true },
            },
            required: ["nome", "dose", "horario"],
            additionalProperties: false,
          },
          nullable: true,
        },
        condicoesAtipicas: {
          type: "array",
          items: { type: "string" },
          nullable: true,
        },
        cuidadosEspeciais: { type: "string", nullable: true },
        observacoes: { type: "string", nullable: true },
      },
      required: [],
      additionalProperties: false,
      nullable: true,
    },
    financeiro: {
      type: "object",
      properties: {
        planoId: { type: "string", nullable: true },
        valorMensalidade: { type: "number", minimum: 0 },
        diaVencimento: { type: "number", minimum: 1, maximum: 31 },
      },
      required: ["valorMensalidade", "diaVencimento"],
      additionalProperties: false,
      nullable: true,
    },
    ativo: { type: "boolean", nullable: true },
  },
  required: [],
  additionalProperties: false,
};
