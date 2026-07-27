import { IProfessor } from "../../types/professores";
import { IFotoUpload, TipoImagemFoto } from "../../types/shared/foto";
import * as fotoUpload from "./fotoUpload";

const PREFIXO = "professores";

export const TIPOS_IMAGEM_PERMITIDOS = fotoUpload.TIPOS_IMAGEM_PERMITIDOS;
export const TAMANHO_MAXIMO_FOTO_BYTES = fotoUpload.TAMANHO_MAXIMO_FOTO_BYTES;
export const TAMANHO_MAXIMO_FOTO_BASE64 = fotoUpload.TAMANHO_MAXIMO_FOTO_BASE64;
export const DOWNLOAD_URL_EXPIRA_EM_SEGUNDOS =
  fotoUpload.DOWNLOAD_URL_EXPIRA_EM_SEGUNDOS;

export const buildFotoKey = (
  professorId: string,
  contentType: TipoImagemFoto,
): string => fotoUpload.buildFotoKey(PREFIXO, professorId, contentType);

export const validarFotoBase64 = fotoUpload.validarFotoBase64;

export const gravarFoto = (
  professorId: string,
  bytes: Buffer,
  contentType: TipoImagemFoto,
): Promise<string> =>
  fotoUpload.gravarFoto(PREFIXO, professorId, bytes, contentType);

export const salvarFotoBase64 = (
  professorId: string,
  foto: IFotoUpload,
): Promise<string> => fotoUpload.salvarFotoBase64(PREFIXO, professorId, foto);

export const withFotoUrl = async <T extends Pick<IProfessor, "foto">>(
  professor: T,
): Promise<T & { fotoUrl?: string }> => fotoUpload.withFotoUrl(professor);

export const withFotoUrls = async <T extends Pick<IProfessor, "foto">>(
  professores: T[],
): Promise<(T & { fotoUrl?: string })[]> => fotoUpload.withFotoUrls(professores);

export const removerFotoDoBucket = fotoUpload.removerFotoDoBucket;
