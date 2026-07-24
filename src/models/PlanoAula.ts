import { Schema } from "mongoose";

export const PlanoAulaSchema = new Schema(
  {
    turmaId: {
      type: Schema.Types.ObjectId,
      ref: "turmas",
      required: true,
      index: true,
    },
    professorId: {
      type: Schema.Types.ObjectId,
      ref: "professores",
      required: true,
      index: true,
    },
    titulo: { type: String, required: true, trim: true },
    descricao: { type: String, required: true, trim: true },
    data: { type: Date, required: true },
    objetivos: { type: [String], default: undefined },
    materiais: { type: [String], default: undefined },
  },
  { timestamps: true },
);

PlanoAulaSchema.index({ turmaId: 1, data: -1 });
