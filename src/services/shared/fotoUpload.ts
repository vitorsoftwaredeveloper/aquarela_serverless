import { randomUUID } from "crypto";
import {
  createPresignedDownloadUrl,
  deleteObject,
  getFotosBucket,
  putObject,
} from "../../libs/s3";
import { IFotoUpload, TipoImagemFoto } from "../../types/shared/foto";
import { httpError, STATUS_CODE } from "../../utils/errors";

export const TIPOS_IMAGEM_PERMITIDOS: TipoImagemFoto[] = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const EXTENSAO_POR_TIPO: Record<TipoImagemFoto, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Teto de 2MB DECODIFICADO. A imagem chega em base64 no corpo do request,
 * então passa pela Lambda — cujo payload síncrono é limitado a 6MB, e
 * base64 infla ~33%. 2MB deixa margem confortável para o resto do cadastro.
 * O front deve redimensionar antes de enviar (avatar 800px/jpeg 0.8 ≈ 150KB).
 */
export const TAMANHO_MAXIMO_FOTO_BYTES = 2 * 1024 * 1024;

/** Teto equivalente em caracteres base64 — gate barato no ajv, antes de decodificar. */
export const TAMANHO_MAXIMO_FOTO_BASE64 =
  Math.ceil(TAMANHO_MAXIMO_FOTO_BYTES / 3) * 4;

/**
 * 1h de leitura: longo o bastante para o front reaproveitar a mesma URL
 * durante a sessão (a URL é a chave de cache do browser), curto o bastante
 * para limitar a exposição de uma URL vazada — o bucket é privado e não
 * existe URL permanente.
 */
export const DOWNLOAD_URL_EXPIRA_EM_SEGUNDOS = 60 * 60;

export const buildFotoKey = (
  prefixo: string,
  entidadeId: string,
  contentType: TipoImagemFoto,
): string =>
  `${prefixo}/${entidadeId}/${randomUUID()}.${EXTENSAO_POR_TIPO[contentType]}`;

/**
 * Confere os bytes iniciais contra o `contentType` declarado. Sem isso, um
 * SVG ou HTML rotulado como `image/jpeg` seria gravado e depois servido com
 * esse Content-Type pelo S3 — o cliente é quem declara, então não dá para
 * confiar nele.
 */
const ASSINATURA_POR_TIPO: Record<TipoImagemFoto, (bytes: Buffer) => boolean> =
  {
    "image/jpeg": (bytes) =>
      bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
    "image/png": (bytes) =>
      bytes
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    "image/webp": (bytes) =>
      bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
      bytes.subarray(8, 12).toString("ascii") === "WEBP",
  };

export const validarFotoBase64 = (foto: IFotoUpload): Buffer => {
  const bytes = Buffer.from(foto.base64, "base64");

  if (bytes.length === 0) {
    throw httpError(
      STATUS_CODE.BAD_REQUEST,
      "FOTO_INVALIDA",
      "Conteúdo da foto vazio ou não é base64 válido.",
    );
  }

  if (bytes.length > TAMANHO_MAXIMO_FOTO_BYTES) {
    throw httpError(
      STATUS_CODE.UNPROCESSABLE_ENTITY,
      "FOTO_MUITO_GRANDE",
      `A foto excede o limite de ${TAMANHO_MAXIMO_FOTO_BYTES / (1024 * 1024)}MB. Redimensione antes de enviar.`,
    );
  }

  if (!ASSINATURA_POR_TIPO[foto.contentType](bytes)) {
    throw httpError(
      STATUS_CODE.UNPROCESSABLE_ENTITY,
      "TIPO_IMAGEM_INVALIDO",
      `O conteúdo enviado não é um arquivo ${foto.contentType} válido.`,
    );
  }

  return bytes;
};

export const gravarFoto = async (
  prefixo: string,
  entidadeId: string,
  bytes: Buffer,
  contentType: TipoImagemFoto,
): Promise<string> => {
  const key = buildFotoKey(prefixo, entidadeId, contentType);
  await putObject({ key, body: bytes, contentType });

  return key;
};

export const salvarFotoBase64 = async (
  prefixo: string,
  entidadeId: string,
  foto: IFotoUpload,
): Promise<string> =>
  gravarFoto(prefixo, entidadeId, validarFotoBase64(foto), foto.contentType);

/**
 * Acrescenta a URL pré-assinada de leitura. Assinar é HMAC local (sem
 * chamada ao S3), então mapear uma listagem inteira não gera request algum.
 * Sem bucket configurado (offline), devolve a entidade sem `fotoUrl`.
 */
export const withFotoUrl = async <T extends { foto?: string }>(
  entidade: T,
): Promise<T & { fotoUrl?: string }> => {
  if (!entidade?.foto || !getFotosBucket()) return entidade;

  return {
    ...entidade,
    fotoUrl: await createPresignedDownloadUrl({
      key: entidade.foto,
      expiresIn: DOWNLOAD_URL_EXPIRA_EM_SEGUNDOS,
    }),
  };
};

export const withFotoUrls = async <T extends { foto?: string }>(
  entidades: T[],
): Promise<(T & { fotoUrl?: string })[]> =>
  Promise.all(entidades.map((entidade) => withFotoUrl(entidade)));

/**
 * Apaga a foto do bucket sem derrubar a operação principal: o dado que
 * importa é o vínculo no Mongo, e um objeto órfão no S3 custa centavos.
 */
export const removerFotoDoBucket = async (key?: string): Promise<void> => {
  if (!key || !getFotosBucket()) return;

  try {
    await deleteObject(key);
  } catch (error) {
    console.error("Falha ao remover foto do S3", { key, error });
  }
};
