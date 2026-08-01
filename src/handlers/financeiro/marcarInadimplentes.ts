import { marcarInadimplentesService } from "../../services/financeiro/marcarInadimplentes";

/**
 * Acionado por schedule (00:05 GMT-3, ver functions.yml) — marca
 * `inadimplenteDesde` nas mensalidades não pagas que já passaram do corte.
 */
export const execute = async (): Promise<void> => {
  const resultado = await marcarInadimplentesService();
  console.log("marcarInadimplentes", resultado);
};
