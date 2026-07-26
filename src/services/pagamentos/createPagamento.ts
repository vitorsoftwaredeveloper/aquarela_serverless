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
    throw httpError(
      STATUS_CODE.CONFLICT,
      "PAGAMENTO_PENDENTE",
      "Já existe um pagamento pendente para esta mensalidade. Aguarde a resolução do pagamento até 1 hora após a criação.",
    );
  }

  let reserva: Awaited<ReturnType<typeof PagamentoRepository.insertOne>>;
  try {
    reserva = await PagamentoRepository.insertOne({
      mensalidadeId,
      criancaId: mensalidade.criancaId,
      metodo: "pix",
      provedor: "mercadopago",
      txid: randomUUID(),
      valor: mensalidade.valor,
      status: "pendente",
    });
  } catch (error: any) {
    if (error?.code === 11000) {
      throw httpError(
        STATUS_CODE.CONFLICT,
        "PAGAMENTO_PENDENTE",
        "Já existe um pagamento pendente para esta mensalidade.",
      );
    }
    throw error;
  }

  try {
    const cobranca = await criarCobrancaPix({
      valor: mensalidade.valor,
      descricao: `Mensalidade ${mensalidade.mes}/${mensalidade.ano}`,
      payerEmail: requester.email,
    });

    await PagamentoRepository.updateOne(
      { _id: reserva._id },
      {
        $set: {
          providerPaymentId: cobranca.providerPaymentId,
          pixCopiaECola: cobranca.pixCopiaECola,
          qrBase64: cobranca.qrBase64,
        },
      },
    );

    return (await PagamentoRepository.findById(reserva._id)) as IPagamento;
  } catch (error) {
    // MercadoPago falhou: remove a reserva pra não deixar um pendente sem QR
    // travando o índice único (e a próxima tentativa do responsável).
    await PagamentoRepository.deleteOne({ _id: reserva._id });
    throw error;
  }
};
