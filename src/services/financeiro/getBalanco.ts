import { db } from "../../libs/mongo";
import { getMesesDoAno } from "./mesesDoAno";

export interface IBalancoMes {
  ano: number;
  mes: number;
  entradas: number;
  despesas: number;
  saldo: number;
}

/**
 * `periodo` aceita `YYYY` (balanço anual, 12 meses) ou `YYYY-MM` (um mês).
 * Sem `periodo`, usa o ano corrente.
 */
const parsePeriodo = (periodo?: string): { ano: number; mes?: number } => {
  const anoMesMatch = periodo?.match(/^(\d{4})-(\d{2})$/);
  if (anoMesMatch) {
    return { ano: Number(anoMesMatch[1]), mes: Number(anoMesMatch[2]) };
  }

  if (periodo?.match(/^\d{4}$/)) {
    return { ano: Number(periodo) };
  }

  return { ano: new Date().getUTCFullYear() };
};

/**
 * Balanço em regime de caixa. Reaproveita `getMesesDoAno` — a mesma fonte do
 * relatório anual —, então ano já expurgado pelo cron `limparDadosAnoAnterior`
 * continua respondendo do snapshot em vez de devolver zeros. O gráfico do
 * dashboard navega até 2020, então isso não é hipótese.
 */
export const getBalancoService = async (
  periodo?: string,
): Promise<IBalancoMes[]> => {
  const { ano, mes } = parsePeriodo(periodo);

  await db();

  const { meses } = await getMesesDoAno(ano);

  return meses
    .filter((item) => (mes ? item.mes === mes : true))
    .map((item) => ({
      ano,
      mes: item.mes,
      entradas: item.pagamentos,
      despesas: item.despesas,
      saldo: item.saldo,
    }));
};
