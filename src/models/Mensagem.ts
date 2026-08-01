import { Schema } from "mongoose";

const AnexoMensagemSchema = new Schema(
  {
    key: { type: String, required: true },
    nome: { type: String, required: true },
    contentType: { type: String, required: true },
    tamanho: { type: Number, required: true },
  },
  { _id: false },
);

export const MensagemSchema = new Schema(
  {
    criancaId: {
      type: Schema.Types.ObjectId,
      ref: "criancas",
      required: true,
    },
    turmaId: { type: Schema.Types.ObjectId, ref: "turmas" },
    autorId: { type: Schema.Types.ObjectId, ref: "usuarios", required: true },
    autorNome: { type: String, required: true },
    autorPapel: {
      type: String,
      enum: ["professor", "responsavel"],
      required: true,
    },
    corpo: { type: String, required: true, trim: true, maxlength: 2000 },
    anexos: { type: [AnexoMensagemSchema], default: [] },
  },
  { timestamps: true },
);

MensagemSchema.index({ criancaId: 1, createdAt: -1 });
