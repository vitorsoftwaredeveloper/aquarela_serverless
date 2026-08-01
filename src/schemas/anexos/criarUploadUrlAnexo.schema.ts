import { JSONSchemaType } from "ajv";
import { ICriarUploadUrlAnexoPayload } from "../../types/anexos";

export const criarUploadUrlAnexoSchema: JSONSchemaType<ICriarUploadUrlAnexoPayload> =
  {
    type: "object",
    properties: {
      escopo: { type: "string", enum: ["mensagem", "agenda", "mural"] },
      nome: { type: "string", minLength: 1, maxLength: 255 },
      contentType: { type: "string", minLength: 1 },
      tamanho: { type: "number", exclusiveMinimum: 0 },
    },
    required: ["escopo", "nome", "contentType", "tamanho"],
    additionalProperties: false,
  };
