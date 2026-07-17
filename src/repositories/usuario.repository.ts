import { createInstanceMongoose } from "./base";
import { UsuarioSchema } from "../models/Usuario";
import { IUsuario } from "../types/usuarios";

export const UsuarioRepository = createInstanceMongoose<IUsuario>(
  "usuarios",
  UsuarioSchema,
);
