import { createInstanceMongoose } from "./base";
import { MensalidadeSchema } from "../models/Mensalidade";
import { IMensalidade } from "../types/mensalidades";

export const MensalidadeRepository = createInstanceMongoose<IMensalidade>(
  "mensalidades",
  MensalidadeSchema,
);
