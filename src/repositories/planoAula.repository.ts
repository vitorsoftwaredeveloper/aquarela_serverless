import { createInstanceMongoose } from "./base";
import { PlanoAulaSchema } from "../models/PlanoAula";
import { IPlanoAula } from "../types/planosAula";

export const PlanoAulaRepository = createInstanceMongoose<IPlanoAula>(
  "planosAula",
  PlanoAulaSchema,
);
