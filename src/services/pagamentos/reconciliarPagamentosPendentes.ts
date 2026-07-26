import { PagamentoRepository } from "../../repositories/pagamento.repository";
import { processarWebhookMercadoPago } from "../webhooks/processarWebhookMercadoPago";
import { IPagamento } from "../../types/pagamentos";

const MAX_TENTATIVAS_RECONCILIACAO = 2;

export const reconciliarPagamentosPendentesService = async (): Promise<{
  verificados: number;
  confirmados: number;
  removidos: number;
}> => {
  const pendentes = (await PagamentoRepository.find({
    status: "pendente",
    providerPaymentId: { $exists: true },
  })) as IPagamento[];

  let confirmados = 0;
  let removidos = 0;
  for (const pagamento of pendentes) {
    try {
      await processarWebhookMercadoPago(pagamento.providerPaymentId as string);

      const atualizado = (await PagamentoRepository.findById(
        pagamento._id,
      )) as IPagamento | null;

      if (!atualizado || atualizado.status !== "pendente") {
        confirmados += 1;
        continue;
      }

      const tentativas = (atualizado.tentativasReconciliacao ?? 0) + 1;

      if (tentativas >= MAX_TENTATIVAS_RECONCILIACAO) {
        await PagamentoRepository.deleteOne({ _id: atualizado._id });
        removidos += 1;
      } else {
        await PagamentoRepository.updateOne(
          { _id: atualizado._id },
          { $set: { tentativasReconciliacao: tentativas } },
        );
      }
    } catch (error) {
      console.error("reconciliarPagamentosPendentes falhou", {
        pagamentoId: pagamento._id,
        providerPaymentId: pagamento.providerPaymentId,
        message: (error as Error)?.message,
      });
    }
  }

  return { verificados: pendentes.length, confirmados, removidos };
};
