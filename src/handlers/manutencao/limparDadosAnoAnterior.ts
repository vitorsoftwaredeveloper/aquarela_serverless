import { limparDadosAnoAnteriorService } from "../../services/manutencao/limparDadosAnoAnterior";

export const execute = async (): Promise<void> => {
  const resultado = await limparDadosAnoAnteriorService();

  console.log("limparDadosAnoAnterior", resultado);
};
