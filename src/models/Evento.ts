import { Schema } from "mongoose";

const FotoEventoSchema = new Schema(
  {
    key: { type: String, required: true },
    nome: { type: String, required: true },
    contentType: { type: String, required: true },
    tamanho: { type: Number, required: true },
    legenda: { type: String, trim: true },
    ordem: { type: Number, required: true },
    enviadoPor: { type: Schema.Types.ObjectId, ref: "usuarios", required: true },
    enviadoEm: { type: Date, required: true },
  },
  { _id: false },
);

export const EventoSchema = new Schema(
  {
    titulo: { type: String, required: true, trim: true },
    descricao: { type: String, trim: true },
    data: { type: Date, required: true },
    turmaId: { type: Schema.Types.ObjectId, ref: "turmas" },
    autorId: { type: Schema.Types.ObjectId, ref: "usuarios", required: true },
    fotos: { type: [FotoEventoSchema], default: [] },
    publicado: { type: Boolean, default: false },
    publicadoEm: { type: Date },
  },
  { timestamps: true },
);

EventoSchema.index({ turmaId: 1, data: -1 });
EventoSchema.index({ publicado: 1, data: -1 });
