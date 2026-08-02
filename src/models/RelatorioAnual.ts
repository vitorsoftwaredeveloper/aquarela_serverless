import { Schema } from "mongoose";

const RelatorioAnualMesSchema = new Schema(
  {
    mes: { type: Number, required: true },
    pagamentos: { type: Number, required: true },
    despesas: { type: Number, required: true },
    saldo: { type: Number, required: true },
    quantidadePagamentos: { type: Number, required: true },
  },
  { _id: false },
);

const RelatorioAnualCriancaMesSchema = new Schema(
  {
    mes: { type: Number, required: true },
    valor: { type: Number, required: true },
    quantidadePagamentos: { type: Number, required: true },
  },
  { _id: false },
);

const RelatorioAnualCriancaSchema = new Schema(
  {
    criancaId: { type: Schema.Types.ObjectId, ref: "criancas", required: true },
    nome: { type: String, required: true },
    turmaNome: { type: String, default: null },
    total: { type: Number, required: true },
    meses: { type: [RelatorioAnualCriancaMesSchema], default: [] },
  },
  { _id: false },
);

const RelatorioAnualTotaisSchema = new Schema(
  {
    pagamentos: { type: Number, required: true },
    despesas: { type: Number, required: true },
    saldo: { type: Number, required: true },
    quantidadePagamentos: { type: Number, required: true },
    criancasComPagamento: { type: Number, required: true },
    ticketMedio: { type: Number, required: true },
  },
  { _id: false },
);

// Fechamento do ano: sobrevive ao expurgo de `pagamentos` feito pelo cron
// `limparDadosAnoAnterior`, então é a única fonte do histórico financeiro
// depois da virada. O nome da criança é desnormalizado de propósito — a
// criança pode ser removida do cadastro depois.
export const RelatorioAnualSchema = new Schema(
  {
    ano: { type: Number, required: true, unique: true },
    consolidadoEm: { type: Date, required: true },
    totais: { type: RelatorioAnualTotaisSchema, required: true },
    meses: { type: [RelatorioAnualMesSchema], default: [] },
    criancas: { type: [RelatorioAnualCriancaSchema], default: [] },
  },
  { timestamps: true },
);
