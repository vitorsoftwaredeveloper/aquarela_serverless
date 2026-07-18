import { gerarMensalidadesDoMesService } from "../../services/mensalidades/gerarMensalidadesDoMes";

/**
 * Acionado por schedule (todo dia 1, ver serverless.yml) — gera a
 * mensalidade da competência corrente para as crianças ativas.
 */
export const execute = async (): Promise<void> => {
  const now = new Date();
  const ano = now.getUTCFullYear();
  const mes = now.getUTCMonth() + 1;

  const resultado = await gerarMensalidadesDoMesService(ano, mes);
  console.log("gerarMensalidades", { ano, mes, ...resultado });
};
