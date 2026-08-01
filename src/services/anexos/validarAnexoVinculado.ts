import { headObject } from "../../libs/s3";
import { EscopoAnexo } from "../../types/anexos";
import { httpError, STATUS_CODE } from "../../utils/errors";
import { PREFIXO_POR_ESCOPO } from "./anexoConstantes";

export interface IAnexoDeclarado {
  key: string;
  contentType: string;
  tamanho: number;
}

const anexoInvalido = (mensagem: string) =>
  httpError(STATUS_CODE.UNPROCESSABLE_ENTITY, "ANEXO_INVALIDO", mensagem);

export const validarAnexoVinculado = async (
  escopo: EscopoAnexo,
  anexo: IAnexoDeclarado,
): Promise<void> => {
  const prefixo = `${PREFIXO_POR_ESCOPO[escopo]}/`;

  if (!anexo.key.startsWith(prefixo)) {
    throw anexoInvalido(`Anexo fora do escopo esperado (${escopo}).`);
  }

  const objeto = await headObject(anexo.key);

  if (!objeto) {
    throw anexoInvalido(
      "Anexo não encontrado no bucket — confirme se o upload terminou.",
    );
  }

  if (
    objeto.contentType !== anexo.contentType ||
    objeto.contentLength !== anexo.tamanho
  ) {
    throw anexoInvalido(
      "Tipo ou tamanho do anexo não batem com o que foi enviado ao bucket.",
    );
  }
};

export const validarAnexosVinculados = async (
  escopo: EscopoAnexo,
  anexos: IAnexoDeclarado[],
): Promise<void> => {
  for (const anexo of anexos) {
    await validarAnexoVinculado(escopo, anexo);
  }
};
