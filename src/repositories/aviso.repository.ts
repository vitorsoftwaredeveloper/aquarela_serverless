import { createInstanceMongoose } from "./base";
import { AvisoSchema } from "../models/Aviso";
import { IAviso } from "../types/avisos";

export const AvisoRepository = createInstanceMongoose<IAviso>(
  "avisos",
  AvisoSchema,
);
