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
const confirmarPagamento = async (pagamento: IPagamento): Promise<void> => {
  await db();
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const pagamentoUpdate = (await PagamentoRepository.updateOne(
        { _id: pagamento._id, status: { $ne: "pago" } },
        {
          $set: { status: "pago", pagoEm: new Date() },
          $unset: { qrBase64: "", pixCopiaECola: "" },
        },
        { session },
      )) as { modifiedCount: number };

      if (pagamentoUpdate.modifiedCount === 0) {
        return;
      }

      await MensalidadeRepository.updateOne(
        { _id: pagamento.mensalidadeId },
        { $set: { status: "pago", pagamentoId: pagamento._id } },
        { session },
      );

      await PagamentoRepository.model.updateMany(
        {
          mensalidadeId: pagamento.mensalidadeId,
          status: "pendente",
          _id: { $ne: pagamento._id },
        },
        { $set: { status: "expirado" } },
        { session },
      );
    });
  } finally {
    await session.endSession();
  }
};

const estornarPagamento = async (pagamento: IPagamento): Promise<void> => {
  await db();
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      await MensalidadeRepository.updateOne(
        { _id: pagamento.mensalidadeId, pagamentoId: pagamento._id },
        { $set: { status: "aberto" }, $unset: { pagamentoId: "" } },
        { session },
      );

      await PagamentoRepository.model.deleteOne(
        { _id: pagamento._id },
        { session },
      );
    });
  } finally {
    await session.endSession();
  }
};

export const processarWebhookMercadoPago = async (
  providerPaymentId: string,
): Promise<void> => {
  const pagamento = (await PagamentoRepository.findOne({
    providerPaymentId,
  })) as IPagamento | null;

  if (!pagamento) {
    console.warn("webhook MercadoPago sem pagamento correspondente", {
      providerPaymentId,
    });
    return;
  }

  const remoto = await buscarPagamento(providerPaymentId);

  if (remoto.status === "approved" && pagamento.status !== "pago") {
    await confirmarPagamento(pagamento);
    return;
  }

  if (remoto.status === "refunded") {
    await estornarPagamento(pagamento);
  }
};
