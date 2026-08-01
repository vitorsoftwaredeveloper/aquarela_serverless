import { Schema } from "mongoose";

const DescontoSchema = new Schema(
  {
    meses: { type: Number, required: true, min: 1 },
    percentual: { type: Number, required: true, min: 0, max: 100 },
  },
  { _id: false },
);

const PlanoSchema = new Schema(
  {
    nome: { type: String, required: true, trim: true },
    tipo: { type: String, enum: ["integral", "meioPeriodo"], required: true },
    valorMensal: { type: Number, required: true, min: 0 },
    valorDiario: { type: Number, min: 0 },
    descontos: { type: [DescontoSchema], default: [] },
  },
  { _id: false },
);

const InadimplenciaSchema = new Schema(
  {
    diaCorte: { type: Number, required: true, min: 1, max: 28 },
    mesesCarencia: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

/**
 * Singleton — sempre um único documento, `_id` fixo ("singleton"). Ver
 * `repositories/configPrecos.repository.ts` (upsert por esse `_id`).
 */
export const ConfigPrecosSchema = new Schema(
  {
    _id: { type: String, default: "singleton" },
    planos: { type: [PlanoSchema], default: [] },
    inadimplencia: { type: InadimplenciaSchema },
    atualizadoPor: { type: Schema.Types.ObjectId, ref: "usuarios" },
  },
  { timestamps: true },
);
