import { randomUUID } from "crypto";
import mongoose from "mongoose";
import { db } from "../../libs/mongo";
import { MensalidadeRepository } from "../../repositories/mensalidade.repository";
import { PagamentoRepository } from "../../repositories/pagamento.repository";
import { IMensalidade } from "../../types/mensalidades";
import { ICreatePagamentoManualPayload, IPagamento } from "../../types/pagamentos";
import { IUsuario } from "../../types/usuarios";
import { httpError, STATUS_CODE } from "../../utils/errors";

export const createPagamentoManualService = async (
  requester: IUsuario,
  payload: ICreatePagamentoManualPayload,
): Promise<IPagamento> => {
  const mensalidade = (await MensalidadeRepository.findById(
    payload.mensalidadeId,
  )) as IMensalidade | null;
  if (!mensalidade) {
    throw httpError(
      STATUS_CODE.NOT_FOUND,
      "NOT_FOUND",
      "Mensalidade não encontrada.",
    );
  }
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

  await db();
  const session = await mongoose.startSession();
  let pagamentoId: string;

  try {
    await session.withTransaction(async () => {
      const reserva = await PagamentoRepository.insertOne(
        {
          mensalidadeId: mensalidade._id,
          criancaId: mensalidade.criancaId,
          metodo: "dinheiro",
          provedor: "manual",
          txid: randomUUID(),
          valor: payload.valor,
          status: "pago",
          pagoEm: new Date(),
          recebidoPor: requester._id,
        },
        { session },
      );
      pagamentoId = String(reserva._id);

      const mensalidadeUpdate = (await MensalidadeRepository.updateOne(
        { _id: mensalidade._id, status: { $nin: ["pago", "cancelado"] } },
        {
          $set: { status: "pago", pagamentoId },
          $unset: { inadimplenteDesde: "" },
        },
        { session },
      )) as { modifiedCount: number };

      if (mensalidadeUpdate.modifiedCount === 0) {
        throw httpError(
          STATUS_CODE.CONFLICT,
          "MENSALIDADE_PAGA",
          "Esta mensalidade já está paga.",
        );
      }

      await PagamentoRepository.model.updateMany(
        {
          mensalidadeId: mensalidade._id,
          status: "pendente",
          _id: { $ne: pagamentoId },
        },
        { $set: { status: "expirado" } },
        { session },
      );
    });
  } finally {
    await session.endSession();
  }

  return (await PagamentoRepository.findById(pagamentoId!)) as IPagamento;
};
