import { Schema } from "mongoose";

export const AvisoSchema = new Schema(
  {
    titulo: { type: String, required: true, trim: true },
    corpo: { type: String, required: true, trim: true },
    autorId: { type: Schema.Types.ObjectId, ref: "usuarios", required: true },
    turmaId: { type: Schema.Types.ObjectId, ref: "turmas" },
    ativo: { type: Boolean, default: true },
  },
  { timestamps: true },
);

AvisoSchema.index({ ativo: 1, createdAt: -1 });
