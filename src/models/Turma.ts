import { Schema } from "mongoose";

export const TurmaSchema = new Schema(
  {
    nome: { type: String, required: true, trim: true },
    descricao: { type: String, trim: true },
    faixaEtaria: {
      min: { type: Number, required: true },
      max: { type: Number, required: true },
    },
    professorId: {
      type: Schema.Types.ObjectId,
      ref: "professores",
      required: true,
      index: true,
    },
    capacidade: { type: Number },
    ativo: { type: Boolean, default: true },
  },
  { timestamps: true },
);
