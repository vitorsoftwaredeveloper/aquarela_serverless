import { PagamentoRepository } from "../../repositories/pagamento.repository";
import { IPagamento } from "../../types/pagamentos";
import { IUsuario } from "../../types/usuarios";
import { loadCriancaParaFinanceiro } from "../shared/financeiroAccess";
import { httpError, STATUS_CODE } from "../../utils/errors";
import { processarWebhookMercadoPago } from "../webhooks/processarWebhookMercadoPago";

// Em dev/local o MercadoPago não consegue entregar o webhook em `localhost`,
// então esse é o único stage onde vale consultar o provedor diretamente a
// partir do polling do front. Nunca ativa em staging/prod — lá a baixa é
// sempre via webhook assinado (mesmo gate de `isDevFallbackAllowed` em
// src/middlewares/auth.ts).
const isDevFallbackAllowed = (): boolean => {
  const stage = (process.env.STAGE || "").toLowerCase();
  return stage === "dev" || stage === "local" || stage === "";
};

export const getPagamentoStatusService = async (
  requester: IUsuario,
  txid: string,
): Promise<IPagamento> => {
  let pagamento = (await PagamentoRepository.findOne({
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

  if (
    pagamento.status === "pendente" &&
    pagamento.providerPaymentId &&
    isDevFallbackAllowed()
  ) {
    await processarWebhookMercadoPago(pagamento.providerPaymentId);
    pagamento = (await PagamentoRepository.findOne({
      txid,
    })) as IPagamento | null;
  }

  if (
    pagamento &&
    pagamento.status === "pago" &&
    (pagamento.qrBase64 || pagamento.pixCopiaECola)
  ) {
    await PagamentoRepository.updateOne(
      { _id: pagamento._id },
      { $unset: { qrBase64: "", pixCopiaECola: "" } },
    );
    delete pagamento.qrBase64;
    delete pagamento.pixCopiaECola;
  }

  return pagamento as IPagamento;
};
