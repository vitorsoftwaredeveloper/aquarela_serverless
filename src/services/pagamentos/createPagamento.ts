import { randomUUID } from "crypto";
import { MensalidadeRepository } from "../../repositories/mensalidade.repository";
import { PagamentoRepository } from "../../repositories/pagamento.repository";
import { criarCobrancaPix } from "../../libs/mercadopago";
import { IMensalidade } from "../../types/mensalidades";
import { IPagamento } from "../../types/pagamentos";
import { IUsuario } from "../../types/usuarios";
import { loadCriancaParaFinanceiro } from "../shared/financeiroAccess";
import { httpError, STATUS_CODE } from "../../utils/errors";

export const createPagamentoService = async (
  requester: IUsuario,
  mensalidadeId: string,
): Promise<IPagamento> => {
  const mensalidade = (await MensalidadeRepository.findById(
    mensalidadeId,
  )) as IMensalidade | null;
  if (!mensalidade) {
    throw httpError(
      STATUS_CODE.NOT_FOUND,
      "NOT_FOUND",
      "Mensalidade não encontrada.",
    );
  }

  await loadCriancaParaFinanceiro(requester, mensalidade.criancaId);

  if (mensalidade.status === "pago") {
    throw httpError(
      STATUS_CODE.CONFLICT,
      "MENSALIDADE_PAGA",
      "Esta mensalidade já está paga.",
    );
  }
  if (mensalidade.status === "cancelado") {
    throw httpError(
      STATUS_CODE.CONFLICT,
      "MENSALIDADE_CANCELADA",
      "Esta mensalidade está cancelada.",
    );
  }

  const pendente = (await PagamentoRepository.findOne({
    mensalidadeId,
    status: "pendente",
  })) as IPagamento | null;
  if (pendente) {
    return pendente;
  }

  const cobranca = await criarCobrancaPix({
    valor: mensalidade.valor,
    descricao: `Mensalidade ${mensalidade.mes}/${mensalidade.ano}`,
    payerEmail: requester.email,
  });

  const created = await PagamentoRepository.insertOne({
    mensalidadeId,
    criancaId: mensalidade.criancaId,
    metodo: "pix",
    provedor: "mercadopago",
    txid: randomUUID(),
    providerPaymentId: cobranca.providerPaymentId,
    valor: mensalidade.valor,
    status: "pendente",
    pixCopiaECola: cobranca.pixCopiaECola,
    qrBase64: cobranca.qrBase64,
  });

  return (await PagamentoRepository.findById(created._id)) as IPagamento;
};
