import mongoose from "mongoose";
import { db } from "../../libs/mongo";
import { buscarPagamento } from "../../libs/mercadopago";
import { PagamentoRepository } from "../../repositories/pagamento.repository";
import { MensalidadeRepository } from "../../repositories/mensalidade.repository";
import { IPagamento } from "../../types/pagamentos";

/**
 * Baixa idempotente do pagamento + mensalidade a partir da notificação do
 * MercadoPago. Nunca confia no corpo do webhook: sempre rebusca o pagamento
 * na API antes de dar baixa. Transação (replicaSet) garante que pagamento e
 * mensalidade mudam de status juntos.
 */
export const processarWebhookMercadoPago = async (
  providerPaymentId: string,
): Promise<void> => {
  const pagamento = (await PagamentoRepository.findOne({
    providerPaymentId,
  })) as IPagamento | null;

  if (!pagamento || pagamento.status === "pago") {
    return;
  }

  const remoto = await buscarPagamento(providerPaymentId);
  if (remoto.status !== "approved") {
    return;
  }

  await db();
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const pagamentoUpdate = (await PagamentoRepository.updateOne(
        { _id: pagamento._id, status: { $ne: "pago" } },
        { $set: { status: "pago", pagoEm: new Date() } },
        { session },
      )) as { modifiedCount: number };

      if (pagamentoUpdate.modifiedCount === 0) {
        // outra invocação concorrente já deu baixa neste pagamento.
        return;
      }

      await MensalidadeRepository.updateOne(
        { _id: pagamento.mensalidadeId },
        { $set: { status: "pago", pagamentoId: pagamento._id } },
        { session },
      );
    });
  } finally {
    await session.endSession();
  }
};
