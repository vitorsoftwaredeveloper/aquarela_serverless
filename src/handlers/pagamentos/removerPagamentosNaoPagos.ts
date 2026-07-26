import { removerPagamentosNaoPagosService } from "../../services/pagamentos/removerPagamentosNaoPagos";

export const execute = async (): Promise<void> => {
  const { removidos } = await removerPagamentosNaoPagosService();

  console.log("removerPagamentosNaoPagos", { removidos });
};
