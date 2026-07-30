import { removerAgendasAnoAnteriorService } from "../../services/agendas/removerAgendasAnoAnterior";

export const execute = async (): Promise<void> => {
  const { removidos } = await removerAgendasAnoAnteriorService();

  console.log("removerAgendasAnoAnterior", { removidos });
};
