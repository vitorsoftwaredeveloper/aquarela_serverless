import { db } from "../../libs/mongo";
import { PagamentoRepository } from "../../repositories/pagamento.repository";

export const removerPagamentosNaoPagosService = async (): Promise<{
  removidos: number;
}> => {
  await db();

  const resultado = await PagamentoRepository.model.deleteMany({
    status: { $ne: "pago" },
  });

  return { removidos: resultado.deletedCount ?? 0 };
};
