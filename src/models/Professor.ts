import { Schema } from "mongoose";

export const ProfessorSchema = new Schema(
  {
    usuarioId: {
      type: Schema.Types.ObjectId,
      ref: "usuarios",
      required: true,
      unique: true,
    },
    nome: { type: String, required: true, trim: true },
    cpf: { type: String, required: true, trim: true },
    telefone: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    formacao: { type: String, trim: true },
    foto: { type: String },
  },
  { timestamps: true },
);
