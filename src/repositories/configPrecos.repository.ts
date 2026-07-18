import { createInstanceMongoose } from "./base";
import { ConfigPrecosSchema } from "../models/ConfigPrecos";
import { IConfigPrecos } from "../types/configPrecos";

export const ConfigPrecosRepository = createInstanceMongoose<IConfigPrecos>(
  "configPrecos",
  ConfigPrecosSchema,
);

export const CONFIG_PRECOS_ID = "singleton";
