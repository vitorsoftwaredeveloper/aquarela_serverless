import { createInstanceMongoose } from "./base";
import { DispositivoSchema } from "../models/Dispositivo";
import { IDispositivo } from "../types/dispositivos";

export const DispositivoRepository = createInstanceMongoose<IDispositivo>(
  "dispositivos",
  DispositivoSchema,
);
