import { MensalidadeRepository } from "../../repositories/mensalidade.repository";
import { IMensalidade } from "../../types/mensalidades";
import { IUsuario } from "../../types/usuarios";
import { loadCriancaParaFinanceiro } from "../shared/financeiroAccess";
import { atualizarMensalidadesAtrasadas } from "../shared/mensalidadeStatus";

export const listMensalidadesService = async (
  requester: IUsuario,
  criancaId: string,
  ano?: number,
): Promise<IMensalidade[]> => {
  await loadCriancaParaFinanceiro(requester, criancaId);

  const query: Record<string, unknown> = { criancaId };
  if (ano) {
    query.ano = ano;
  }

  await atualizarMensalidadesAtrasadas(query);

  return (await MensalidadeRepository.find(query, null, {
    sort: { ano: 1, mes: 1 },
  })) as IMensalidade[];
};
