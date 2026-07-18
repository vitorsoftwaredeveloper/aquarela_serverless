import { Schema } from "mongoose";

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
  },
  { timestamps: true },
);

MensalidadeSchema.index({ criancaId: 1, ano: 1, mes: 1 }, { unique: true });
