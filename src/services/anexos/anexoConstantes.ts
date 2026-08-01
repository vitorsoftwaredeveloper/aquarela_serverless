import { EscopoAnexo, TipoAnexo } from "../../types/anexos";

export const ANEXO_TIPOS_PERMITIDOS: TipoAnexo[] = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

export const ANEXO_TAMANHO_MAXIMO_BYTES = 10 * 1024 * 1024;

export const PREFIXO_POR_ESCOPO: Record<EscopoAnexo, string> = {
  mensagem: "mensagens",
  agenda: "agendas",
  mural: "eventos",
};

export const EXTENSAO_POR_TIPO: Record<TipoAnexo, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export const isTipoAnexoPermitido = (
  contentType: string,
): contentType is TipoAnexo =>
  (ANEXO_TIPOS_PERMITIDOS as string[]).includes(contentType);
