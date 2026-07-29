import { PagamentoRepository } from "../../repositories/pagamento.repository";
import { IPagamento } from "../../types/pagamentos";
import { IUsuario } from "../../types/usuarios";
import { loadCriancaParaFinanceiro } from "../shared/financeiroAccess";
import { httpError, STATUS_CODE } from "../../utils/errors";
import { processarWebhookMercadoPago } from "../webhooks/processarWebhookMercadoPago";

const INTERVALO_MINIMO_CONSULTA_PROVEDOR_MS = 10_000;

const deveConsultarProvedor = (pagamento: IPagamento): boolean => {
  if (pagamento.status !== "pendente" || !pagamento.providerPaymentId) {
    return false;
  }

  const ultimaConsulta = pagamento.ultimaConsultaProvedorEm;
  if (!ultimaConsulta) {
    return true;
  }

  return (
    Date.now() - new Date(ultimaConsulta).getTime() >=
    INTERVALO_MINIMO_CONSULTA_PROVEDOR_MS
  );
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

  if (deveConsultarProvedor(pagamento)) {
    try {
      await PagamentoRepository.updateOne(
        { _id: pagamento._id },
        { $set: { ultimaConsultaProvedorEm: new Date() } },
      );

      await processarWebhookMercadoPago(pagamento.providerPaymentId as string);

      pagamento = (await PagamentoRepository.findOne({
        txid,
      })) as IPagamento | null;
    } catch (error) {
      console.error("consulta ao MercadoPago no polling de status falhou", {
        txid,
        providerPaymentId: pagamento?.providerPaymentId,
        message: (error as Error)?.message,
      });
    }
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
