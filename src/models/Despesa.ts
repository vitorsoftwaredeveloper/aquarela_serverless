import { Schema } from "mongoose";

export const DespesaSchema = new Schema(
  {
    descricao: { type: String, required: true, trim: true },
    categoria: { type: String, required: true, trim: true },
    valor: { type: Number, required: true },
    data: { type: Date, required: true, index: true },
    lancadoPor: { type: Schema.Types.ObjectId, ref: "usuarios", required: true },
    anexoUrl: { type: String },
  },
  { timestamps: true },
);
