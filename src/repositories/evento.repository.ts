import { createInstanceMongoose } from "./base";
import { EventoSchema } from "../models/Evento";
import { IEvento } from "../types/eventos";

export const EventoRepository = createInstanceMongoose<IEvento>(
  "eventos",
  EventoSchema,
);
