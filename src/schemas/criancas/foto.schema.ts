import { JSONSchemaType } from "ajv";
import { IFotoUpload } from "../../types/criancas";
import {
  TAMANHO_MAXIMO_FOTO_BASE64,
  TIPOS_IMAGEM_PERMITIDOS,
} from "../../services/shared/fotoCrianca";

export const fotoUploadSchema: JSONSchemaType<IFotoUpload> = {
  type: "object",
  properties: {
    contentType: { type: "string", enum: TIPOS_IMAGEM_PERMITIDOS },
    base64: {
      type: "string",
      minLength: 1,
      maxLength: TAMANHO_MAXIMO_FOTO_BASE64,
      pattern: "^[A-Za-z0-9+/]+={0,2}$",
    },
  },
  required: ["contentType", "base64"],
  additionalProperties: false,
};
