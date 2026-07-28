import { Schema } from "mongoose";

const AlimentacaoItemSchema = new Schema(
  {
    refeicao: {
      type: String,
      enum: ["cafe", "almoco", "lanche", "janta"],
      required: true,
    },
    aceitacao: {
      type: String,
      enum: ["tudo", "parte", "recusou"],
      required: true,
    },
    obs: { type: String },
  },
  { _id: false },
);

const SonoItemSchema = new Schema(
  {
    inicio: { type: String, required: true },
    fim: { type: String, required: true },
  },
  { _id: false },
);

const HigieneSchema = new Schema(
  {
    fraldas: { type: Number },
    obs: { type: String },
  },
  { _id: false },
);

const MedicacaoAdministradaSchema = new Schema(
  {
    nome: { type: String, required: true },
    dose: { type: String, required: true },
    hora: { type: String, required: true },
    aplicadaPor: { type: String, required: true },
  },
  { _id: false },
);

const IntercorrenciaSchema = new Schema(
  {
    tipo: {
      type: String,
      enum: ["febre", "queda", "doenca", "outro"],
      required: true,
    },
    descricao: { type: String, required: true },
    hora: { type: String, required: true },
    notificado: { type: Boolean, default: false },
  },
  { _id: false },
);

export const AgendaDiariaSchema = new Schema(
  {
    criancaId: {
      type: Schema.Types.ObjectId,
      ref: "criancas",
      required: true,
      index: true,
    },
    turmaId: { type: Schema.Types.ObjectId, ref: "turmas", required: true },
    data: { type: Date, required: true },
    registradoPor: {
      type: Schema.Types.ObjectId,
      ref: "professores",
      required: true,
    },
    alimentacao: { type: [AlimentacaoItemSchema], default: [] },
    sono: { type: [SonoItemSchema], default: [] },
    atividades: { type: [String], default: [] },
    humor: {
      type: String,
      enum: ["feliz", "tranquilo", "neutro", "choroso"],
    },
    higiene: { type: HigieneSchema },
    medicacoesAdministradas: { type: [MedicacaoAdministradaSchema], default: [] },
    intercorrencias: { type: [IntercorrenciaSchema], default: [] },
    observacoes: { type: String },
    enviadaEm: { type: Date, default: null },
  },
  { timestamps: true },
);

// Um registro por criança/dia; índice desc para o histórico por período.
AgendaDiariaSchema.index({ criancaId: 1, data: 1 }, { unique: true });
AgendaDiariaSchema.index({ criancaId: 1, data: -1 });
