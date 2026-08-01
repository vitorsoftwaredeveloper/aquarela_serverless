import { Schema } from "mongoose";

const CobrancaSchema = new Schema(
  {
    enviadaEm: { type: Date, required: true },
    canal: { type: String, enum: ["push"], required: true },
    gatilho: {
      type: String,
      enum: ["dia05", "dia20", "manual"],
      required: true,
    },
  },
  { _id: false },
);

export const MensalidadeSchema = new Schema(
  {
    criancaId: {
      type: Schema.Types.ObjectId,
      ref: "criancas",
      required: true,
      index: true,
    },
    ano: { type: Number, required: true },
    mes: { type: Number, required: true, min: 1, max: 12 },
    valor: { type: Number, required: true },
    vencimento: { type: Date, required: true },
    status: {
      type: String,
      enum: ["aberto", "pago", "atrasado", "cancelado"],
      default: "aberto",
      index: true,
    },
    pagamentoId: { type: Schema.Types.ObjectId, ref: "pagamentos" },
    inadimplenteDesde: { type: Date, index: true },
    cobrancas: { type: [CobrancaSchema], default: [] },
  },
  { timestamps: true },
);

MensalidadeSchema.index({ criancaId: 1, ano: 1, mes: 1 }, { unique: true });
