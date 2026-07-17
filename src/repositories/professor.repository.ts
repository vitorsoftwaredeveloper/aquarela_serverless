import { createInstanceMongoose } from "./base";
import { ProfessorSchema } from "../models/Professor";
import { IProfessor } from "../types/professores";

export const ProfessorRepository = createInstanceMongoose<IProfessor>(
  "professores",
  ProfessorSchema,
);
