import { MensagemRepository } from "../../repositories/mensagem.repository";
import { IListMensagensFilters, IMensagem } from "../../types/mensagens";
import { IUsuario } from "../../types/usuarios";
import { loadCriancaParaMensagem } from "../shared/mensagemAccess";
import { withAnexosUrls, IMensagemComAnexosUrl } from "./withAnexosUrl";

const LIMIT_PADRAO = 30;
const LIMIT_MAXIMO = 100;

export const listMensagensService = async (
  requester: IUsuario,
  filters: IListMensagensFilters,
): Promise<IMensagemComAnexosUrl[]> => {
  await loadCriancaParaMensagem(requester, filters.criancaId);

  const limit = Math.min(
    Math.max(1, filters.limit ?? LIMIT_PADRAO),
    LIMIT_MAXIMO,
  );

  const query: Record<string, unknown> = { criancaId: filters.criancaId };
  if (filters.antesDe) {
    query.createdAt = { $lt: new Date(filters.antesDe) };
  }

  const mensagens = (await MensagemRepository.find(query, null, {
    sort: { createdAt: -1 },
    limit,
  })) as IMensagem[];

  return withAnexosUrls(mensagens);
};
