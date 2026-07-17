import { createInstanceMongoose } from "./base";
import { CriancaSchema } from "../models/Crianca";
import { ICrianca } from "../types/criancas";

export const CriancaRepository = createInstanceMongoose<ICrianca>(
  "criancas",
  CriancaSchema,
);
