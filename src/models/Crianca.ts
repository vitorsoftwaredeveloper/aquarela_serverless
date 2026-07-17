import { Schema } from "mongoose";

const ResponsavelSchema = new Schema(
  {
    usuarioId: { type: Schema.Types.ObjectId, ref: "usuarios" },
    nome: { type: String, required: true, trim: true },
    cpf: { type: String, required: true, trim: true },
    parentesco: { type: String, required: true, trim: true },
    telefone: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    podeRetirar: { type: Boolean, default: true },
  },
  { _id: false },
);

const MedicacaoContinuaSchema = new Schema(
  {
    nome: { type: String, required: true },
    dose: { type: String, required: true },
    horario: { type: String, required: true },
    observacao: { type: String },
  },
  { _id: false },
);

const SaudeSchema = new Schema(
  {
    alergias: [{ type: String }],
    restricoesAlimentares: [{ type: String }],
    medicacoesContinuas: [MedicacaoContinuaSchema],
    condicoesAtipicas: [{ type: String }],
    cuidadosEspeciais: { type: String },
    observacoes: { type: String },
  },
  { _id: false },
);

const FinanceiroCriancaSchema = new Schema(
  {
    planoId: { type: Schema.Types.ObjectId, ref: "configPrecos" },
    valorMensalidade: { type: Number, required: true },
    diaVencimento: { type: Number, required: true },
  },
  { _id: false },
);

const AuditoriaEntrySchema = new Schema(
  {
    usuarioId: { type: Schema.Types.ObjectId, ref: "usuarios", required: true },
    alteradoEm: { type: Date, required: true },
    campos: [{ type: String }],
  },
  { _id: false },
);

export const CriancaSchema = new Schema(
  {
    nome: { type: String, required: true, trim: true },
    dataNascimento: { type: Date, required: true },
    cpf: { type: String, required: true, unique: true, trim: true },
    foto: { type: String },
    // Divergência deliberada de docs/04: opcional para suportar
    // desvincular a criança de uma turma sem removê-la (ver DELETE
    // /turmas/{id}/criancas/{criancaId}).
    turmaId: {
      type: Schema.Types.ObjectId,
      ref: "turmas",
      default: null,
      index: true,
    },
    responsaveis: { type: [ResponsavelSchema], required: true },
    saude: { type: SaudeSchema, default: () => ({}) },
    financeiro: { type: FinanceiroCriancaSchema, required: true },
    // Divergência deliberada de docs/04: trilha mínima de auditoria
    // (CAD-09) embutida, capada às últimas 50 entradas.
    auditoria: { type: [AuditoriaEntrySchema], default: [] },
    ativo: { type: Boolean, default: true },
  },
  { timestamps: true },
);

CriancaSchema.index({ nome: "text" });
