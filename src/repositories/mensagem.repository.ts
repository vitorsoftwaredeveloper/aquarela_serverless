import { createInstanceMongoose } from "./base";
import { MensagemSchema } from "../models/Mensagem";
import { IMensagem } from "../types/mensagens";

export const MensagemRepository = createInstanceMongoose<IMensagem>(
  "mensagens",
  MensagemSchema,
);
