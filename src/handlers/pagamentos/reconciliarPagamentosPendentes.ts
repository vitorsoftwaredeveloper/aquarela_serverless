import { reconciliarPagamentosPendentesService } from "../../services/pagamentos/reconciliarPagamentosPendentes";

export const execute = async (): Promise<void> => {
  const { verificados, confirmados, removidos } =
    await reconciliarPagamentosPendentesService();

  console.log("reconciliarPagamentosPendentes", {
    verificados,
    confirmados,
    removidos,
  });
};
