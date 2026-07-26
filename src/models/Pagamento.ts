import { Schema } from "mongoose";

export const PagamentoSchema = new Schema(
  {
    mensalidadeId: {
      type: Schema.Types.ObjectId,
      ref: "mensalidades",
      required: true,
    },
    criancaId: { type: Schema.Types.ObjectId, ref: "criancas", required: true },
    metodo: { type: String, enum: ["pix"], required: true, default: "pix" },
    provedor: {
      type: String,
      enum: ["mercadopago"],
      required: true,
      default: "mercadopago",
    },
    txid: { type: String, required: true, unique: true },
    providerPaymentId: { type: String },
    valor: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pendente", "pago", "expirado", "falhou"],
      default: "pendente",
      index: true,
    },
    pixCopiaECola: { type: String },
    qrBase64: { type: String },
    reciboUrl: { type: String },
    pagoEm: { type: Date },
    tentativasReconciliacao: { type: Number, default: 0 },
  },
  { timestamps: true },
);

PagamentoSchema.index(
  { mensalidadeId: 1 },
  { unique: true, partialFilterExpression: { status: "pendente" } },
);
