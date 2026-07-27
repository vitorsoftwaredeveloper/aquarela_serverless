export type TipoImagemFoto = "image/jpeg" | "image/png" | "image/webp";

export interface IFotoUpload {
  contentType: TipoImagemFoto;
  base64: string;
}
