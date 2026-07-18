import { createInstanceMongoose } from "./base";
import { DespesaSchema } from "../models/Despesa";
import { IDespesa } from "../types/despesas";

export const DespesaRepository = createInstanceMongoose<IDespesa>(
  "despesas",
  DespesaSchema,
);
