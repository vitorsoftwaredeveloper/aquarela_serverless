import { createInstanceMongoose } from "./base";
import { RelatorioAnualSchema } from "../models/RelatorioAnual";
import { IRelatorioAnual } from "../types/relatorios";

export const RelatorioAnualRepository = createInstanceMongoose<IRelatorioAnual>(
  "relatoriosAnuais",
  RelatorioAnualSchema,
);
