import { Schema } from "mongoose";

export const TurmaSchema = new Schema(
  {
    nome: { type: String, required: true, trim: true },
    descricao: { type: String, trim: true },
    faixaEtaria: {
      min: { type: Number, required: true },
      max: { type: Number, required: true },
    },
    professorIds: {
      type: [{ type: Schema.Types.ObjectId, ref: "professores" }],
      required: true,
      index: true,
      validate: {
        validator: (v: unknown[]) => Array.isArray(v) && v.length >= 1,
        message: "Turma precisa de ao menos um professor.",
      },
    },
    capacidade: { type: Number },
  },
  { timestamps: true },
);
