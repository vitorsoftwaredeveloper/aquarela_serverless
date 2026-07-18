import { PagamentoRepository } from "../../repositories/pagamento.repository";
import { IPagamento } from "../../types/pagamentos";
import { IUsuario } from "../../types/usuarios";
import { loadCriancaParaFinanceiro } from "../shared/financeiroAccess";
import { httpError, STATUS_CODE } from "../../utils/errors";

export const getPagamentoStatusService = async (
  requester: IUsuario,
  txid: string,
): Promise<IPagamento> => {
  const pagamento = (await PagamentoRepository.findOne({
    txid,
  })) as IPagamento | null;
  if (!pagamento) {
    throw httpError(
      STATUS_CODE.NOT_FOUND,
      "NOT_FOUND",
      "Pagamento não encontrado.",
    );
  }

  await loadCriancaParaFinanceiro(requester, pagamento.criancaId);

  return pagamento;
};
