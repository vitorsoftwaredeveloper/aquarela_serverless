import { JSONSchemaType } from "ajv";
import { ICreateAgendaPayload } from "../../types/agendas";

const alimentacaoItemSchema = {
  type: "object",
  properties: {
    refeicao: { type: "string", enum: ["cafe", "almoco", "lanche", "janta"] },
    aceitacao: { type: "string", enum: ["tudo", "parte", "recusou"] },
    obs: { type: "string", nullable: true },
  },
  required: ["refeicao", "aceitacao"],
  additionalProperties: false,
} as const;

const sonoItemSchema = {
  type: "object",
  properties: {
    inicio: { type: "string", minLength: 1 },
    fim: { type: "string", minLength: 1 },
  },
  required: ["inicio", "fim"],
  additionalProperties: false,
} as const;

const medicacaoAdministradaSchema = {
  type: "object",
  properties: {
    nome: { type: "string", minLength: 1 },
    dose: { type: "string", minLength: 1 },
    hora: { type: "string", minLength: 1 },
    aplicadaPor: { type: "string", minLength: 1 },
  },
  required: ["nome", "dose", "hora", "aplicadaPor"],
  additionalProperties: false,
} as const;

const intercorrenciaSchema = {
  type: "object",
  properties: {
    tipo: { type: "string", enum: ["febre", "queda", "doenca", "outro"] },
    descricao: { type: "string", minLength: 1 },
    hora: { type: "string", minLength: 1 },
    notificado: { type: "boolean", nullable: true },
  },
  required: ["tipo", "descricao", "hora"],
  additionalProperties: false,
} as const;

export const createAgendaSchema: JSONSchemaType<ICreateAgendaPayload> = {
  type: "object",
  properties: {
    criancaId: { type: "string", minLength: 1 },
    data: { type: "string", format: "date" },
    alimentacao: {
      type: "array",
      items: alimentacaoItemSchema,
      nullable: true,
    },
    sono: { type: "array", items: sonoItemSchema, nullable: true },
    atividades: {
      type: "array",
      items: { type: "string" },
      nullable: true,
    },
    humor: {
      type: "string",
      enum: ["feliz", "tranquilo", "neutro", "choroso"],
      nullable: true,
    },
    higiene: {
      type: "object",
      properties: {
        fraldas: { type: "number", minimum: 0, nullable: true },
        obs: { type: "string", nullable: true },
      },
      required: [],
      additionalProperties: false,
      nullable: true,
    },
    medicacoesAdministradas: {
      type: "array",
      items: medicacaoAdministradaSchema,
      nullable: true,
    },
    intercorrencias: {
      type: "array",
      items: intercorrenciaSchema,
      nullable: true,
    },
    observacoes: { type: "string", nullable: true },
  },
  required: ["criancaId", "data"],
  additionalProperties: false,
};
