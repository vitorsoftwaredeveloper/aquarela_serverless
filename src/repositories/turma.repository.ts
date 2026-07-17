import { createInstanceMongoose } from "./base";
import { TurmaSchema } from "../models/Turma";
import { ITurma } from "../types/turmas";

export const TurmaRepository = createInstanceMongoose<ITurma>(
  "turmas",
  TurmaSchema,
);
