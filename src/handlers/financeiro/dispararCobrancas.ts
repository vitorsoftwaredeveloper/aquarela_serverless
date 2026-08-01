import { dispararCobrancasService } from "../../services/financeiro/dispararCobrancas";
import { hojeMeiaNoiteBrasil } from "../../utils/date";
import { GatilhoCobranca } from "../../types/mensalidades";

/**
 * Acionado por schedule (dias 05 e 20, 09:00 GMT-3 — ver functions.yml).
 * Gatilho deriva do dia do mês em GMT-3, não do dia UTC.
 */
export const execute = async (): Promise<void> => {
  const dia = hojeMeiaNoiteBrasil().getUTCDate();
  const gatilho: GatilhoCobranca = dia === 20 ? "dia20" : "dia05";

  const resultado = await dispararCobrancasService(gatilho, false);
  console.log("dispararCobrancas", { gatilho, ...resultado });
};
