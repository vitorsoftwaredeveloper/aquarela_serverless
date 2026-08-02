import { createPresignedDownloadUrl, getFotosBucket } from "../../libs/s3";
import { IEvento, IFotoEvento } from "../../types/eventos";

const DOWNLOAD_URL_EXPIRA_EM_SEGUNDOS = 60 * 60;

export interface IFotoComUrl extends IFotoEvento {
  url?: string;
}

export interface IEventoComFotosUrl extends Omit<IEvento, "fotos"> {
  fotos: IFotoComUrl[];
}

export const withFotosUrl = async (
  evento: IEvento,
): Promise<IEventoComFotosUrl> => {
  if (evento.fotos.length === 0 || !getFotosBucket()) {
    return evento as IEventoComFotosUrl;
  }

  const fotos = await Promise.all(
    evento.fotos.map(async (foto) => ({
      ...foto,
      url: await createPresignedDownloadUrl({
        key: foto.key,
        expiresIn: DOWNLOAD_URL_EXPIRA_EM_SEGUNDOS,
      }),
    })),
  );

  return { ...evento, fotos };
};

export const withFotosUrls = async (
  eventos: IEvento[],
): Promise<IEventoComFotosUrl[]> =>
  Promise.all(eventos.map((evento) => withFotosUrl(evento)));
