import { createPresignedDownloadUrl, getFotosBucket } from "../../libs/s3";
import { IAnexoReferencia } from "../../types/anexos";
import { IAgendaDiaria } from "../../types/agendas";

const DOWNLOAD_URL_EXPIRA_EM_SEGUNDOS = 60 * 60;

export interface IAnexoComUrl extends IAnexoReferencia {
  url?: string;
}

export interface IAgendaComAnexosUrl extends Omit<IAgendaDiaria, "anexos"> {
  anexos: IAnexoComUrl[];
}

export const withAgendaAnexosUrl = async (
  agenda: IAgendaDiaria,
): Promise<IAgendaComAnexosUrl> => {
  if (!agenda.anexos || agenda.anexos.length === 0 || !getFotosBucket()) {
    return { ...agenda, anexos: agenda.anexos ?? [] } as IAgendaComAnexosUrl;
  }

  const anexos = await Promise.all(
    agenda.anexos.map(async (anexo) => ({
      ...anexo,
      url: await createPresignedDownloadUrl({
        key: anexo.key,
        expiresIn: DOWNLOAD_URL_EXPIRA_EM_SEGUNDOS,
      }),
    })),
  );

  return { ...agenda, anexos };
};

export const withAgendaAnexosUrls = async (
  agendas: IAgendaDiaria[],
): Promise<IAgendaComAnexosUrl[]> =>
  Promise.all(agendas.map((agenda) => withAgendaAnexosUrl(agenda)));
