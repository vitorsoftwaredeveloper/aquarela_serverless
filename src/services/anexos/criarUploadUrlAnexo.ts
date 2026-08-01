import { randomUUID } from "crypto";
import { createPresignedUploadUrl } from "../../libs/s3";
import {
  EscopoAnexo,
  ICriarUploadUrlAnexoPayload,
  ICriarUploadUrlAnexoResponse,
  TipoAnexo,
} from "../../types/anexos";
import { httpError, STATUS_CODE } from "../../utils/errors";
import {
  ANEXO_TAMANHO_MAXIMO_BYTES,
  EXTENSAO_POR_TIPO,
  PREFIXO_POR_ESCOPO,
  isTipoAnexoPermitido,
} from "./anexoConstantes";

export const ANEXO_UPLOAD_URL_EXPIRA_EM_SEGUNDOS = 5 * 60;

export const buildAnexoKey = (
  escopo: EscopoAnexo,
  contentType: TipoAnexo,
): string =>
  `${PREFIXO_POR_ESCOPO[escopo]}/${randomUUID()}.${EXTENSAO_POR_TIPO[contentType]}`;

export const criarUploadUrlAnexoService = async (
  payload: ICriarUploadUrlAnexoPayload,
): Promise<ICriarUploadUrlAnexoResponse> => {
  if (!isTipoAnexoPermitido(payload.contentType)) {
    throw httpError(
      STATUS_CODE.UNPROCESSABLE_ENTITY,
      "TIPO_ANEXO_INVALIDO",
      `Tipo ${payload.contentType} não permitido.`,
    );
  }

  if (payload.tamanho > ANEXO_TAMANHO_MAXIMO_BYTES) {
    throw httpError(
      STATUS_CODE.UNPROCESSABLE_ENTITY,
      "ANEXO_MUITO_GRANDE",
      `Anexo excede o limite de ${ANEXO_TAMANHO_MAXIMO_BYTES / (1024 * 1024)}MB.`,
    );
  }

  const key = buildAnexoKey(payload.escopo, payload.contentType);

  const uploadUrl = await createPresignedUploadUrl({
    key,
    contentType: payload.contentType,
    contentLength: payload.tamanho,
    expiresIn: ANEXO_UPLOAD_URL_EXPIRA_EM_SEGUNDOS,
  });

  return {
    key,
    uploadUrl,
    expiraEm: ANEXO_UPLOAD_URL_EXPIRA_EM_SEGUNDOS,
  };
};
