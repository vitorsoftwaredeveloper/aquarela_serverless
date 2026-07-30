import { Schema } from "mongoose";

// Sem generic `Schema<T>`: o Mongoose exige que os tipos dos campos batam
// exatamente com a interface de domínio (ex.: ObjectId vs `string`), o que
// não vale a pena aqui — a tipagem de payload/consumo fica em `types/`.
export const UsuarioSchema = new Schema(
  {
    cognitoSub: { type: String, required: true, unique: true },
    nome: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    papel: {
      type: String,
      enum: ["admin", "professor", "responsavel"],
      required: true,
    },
    telefone: { type: String, trim: true },
    professorId: { type: Schema.Types.ObjectId, ref: "professores" },
    criancasVinculadas: [{ type: Schema.Types.ObjectId, ref: "criancas" }],
  },
  { timestamps: true },
);
