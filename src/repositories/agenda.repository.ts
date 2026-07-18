import { createInstanceMongoose } from "./base";
import { AgendaDiariaSchema } from "../models/AgendaDiaria";
import { IAgendaDiaria } from "../types/agendas";

export const AgendaRepository = createInstanceMongoose<IAgendaDiaria>(
  "agendasDiarias",
  AgendaDiariaSchema,
);
