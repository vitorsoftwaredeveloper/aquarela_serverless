import { Schema } from "mongoose";

export const DispositivoSchema = new Schema(
  {
    usuarioId: {
      type: Schema.Types.ObjectId,
      ref: "usuarios",
      required: true,
      index: true,
    },
    token: { type: String, required: true, unique: true },
    plataforma: {
      type: String,
      enum: ["android", "ios", "web", "desktop"],
      required: true,
    },
    instalado: { type: Boolean, required: true, default: false },
    ultimoUsoEm: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true },
);
