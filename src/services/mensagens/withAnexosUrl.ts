import { createPresignedDownloadUrl, getFotosBucket } from "../../libs/s3";
import { IAnexoReferencia } from "../../types/anexos";
import { IMensagem } from "../../types/mensagens";

const DOWNLOAD_URL_EXPIRA_EM_SEGUNDOS = 60 * 60;

export interface IAnexoComUrl extends IAnexoReferencia {
  url?: string;
}

export interface IMensagemComAnexosUrl extends Omit<IMensagem, "anexos"> {
  anexos: IAnexoComUrl[];
}

export const withAnexosUrl = async (
  mensagem: IMensagem,
): Promise<IMensagemComAnexosUrl> => {
  if (mensagem.anexos.length === 0 || !getFotosBucket()) {
    return mensagem as IMensagemComAnexosUrl;
  }

  const anexos = await Promise.all(
    mensagem.anexos.map(async (anexo) => ({
      ...anexo,
      url: await createPresignedDownloadUrl({
        key: anexo.key,
        expiresIn: DOWNLOAD_URL_EXPIRA_EM_SEGUNDOS,
      }),
    })),
  );

  return { ...mensagem, anexos };
};

export const withAnexosUrls = async (
  mensagens: IMensagem[],
): Promise<IMensagemComAnexosUrl[]> =>
  Promise.all(mensagens.map((mensagem) => withAnexosUrl(mensagem)));
