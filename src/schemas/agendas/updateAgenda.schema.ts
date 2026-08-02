import { JSONSchemaType } from "ajv";
import { IUpdateAgendaPayload } from "../../types/agendas";

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

const tarefaCasaSchema = {
  type: "object",
  properties: {
    status: { type: "string", enum: ["feito", "nao_feito", "incompleto"] },
    observacao: { type: "string", nullable: true },
  },
  required: ["status"],
  additionalProperties: false,
} as const;

const presencaSchema = {
  type: "object",
  properties: {
    status: { type: "string", enum: ["presente", "falta", "atrasado"] },
    horaChegada: { type: "string", nullable: true },
    justificativa: { type: "string", nullable: true },
  },
  required: ["status"],
  additionalProperties: false,
  if: { properties: { status: { const: "atrasado" } }, required: ["status"] },
  then: { required: ["horaChegada"] },
} as const;

const anexoSchema = {
  type: "object",
  properties: {
    key: { type: "string", minLength: 1 },
    nome: { type: "string", minLength: 1 },
    contentType: { type: "string", minLength: 1 },
    tamanho: { type: "number", exclusiveMinimum: 0 },
  },
  required: ["key", "nome", "contentType", "tamanho"],
  additionalProperties: false,
} as const;

export const updateAgendaSchema: JSONSchemaType<IUpdateAgendaPayload> = {
  type: "object",
  properties: {
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
    tarefaCasa: { ...tarefaCasaSchema, nullable: true },
    presenca: { ...presencaSchema, nullable: true },
    anexos: {
      type: "array",
      items: anexoSchema,
      maxItems: 5,
      nullable: true,
    },
  },
  required: [],
  additionalProperties: false,
};
