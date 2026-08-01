export type EscopoAnexo = "mensagem" | "agenda" | "mural";

export type TipoAnexo =
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "application/pdf";

export interface ICriarUploadUrlAnexoPayload {
  escopo: EscopoAnexo;
  nome: string;
  contentType: string;
  tamanho: number;
}

export interface ICriarUploadUrlAnexoResponse {
  key: string;
  uploadUrl: string;
  expiraEm: number;
}

export interface IAnexoReferencia {
  key: string;
  nome: string;
  contentType: string;
  tamanho: number;
}
