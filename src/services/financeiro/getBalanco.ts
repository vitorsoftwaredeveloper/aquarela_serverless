import { db } from "../../libs/mongo";
import { MensalidadeRepository } from "../../repositories/mensalidade.repository";
import { DespesaRepository } from "../../repositories/despesa.repository";

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

export const getBalancoService = async (
  periodo?: string,
): Promise<IBalancoMes[]> => {
  const { ano, mes } = parsePeriodo(periodo);
  const mesesFiltro = mes ? [mes] : Array.from({ length: 12 }, (_, i) => i + 1);

  await db();

  const entradasPorMes = await MensalidadeRepository.model.aggregate([
    { $match: { ano, mes: { $in: mesesFiltro }, status: "pago" } },
    { $group: { _id: "$mes", total: { $sum: "$valor" } } },
  ]);

  const inicioPeriodo = new Date(Date.UTC(ano, mes ? mes - 1 : 0, 1));
  const fimPeriodo = new Date(Date.UTC(ano, mes ? mes : 12, 1));

  const despesasPorMes = await DespesaRepository.model.aggregate([
    { $match: { data: { $gte: inicioPeriodo, $lt: fimPeriodo } } },
    { $group: { _id: { $month: "$data" }, total: { $sum: "$valor" } } },
  ]);

  const entradasPorMesMap = new Map<number, number>(
    entradasPorMes.map((item) => [item._id, item.total]),
  );
  const despesasPorMesMap = new Map<number, number>(
    despesasPorMes.map((item) => [item._id, item.total]),
  );

  return mesesFiltro.map((mesAtual) => {
    const entradas = entradasPorMesMap.get(mesAtual) ?? 0;
    const despesas = despesasPorMesMap.get(mesAtual) ?? 0;
    return { ano, mes: mesAtual, entradas, despesas, saldo: entradas - despesas };
  });
};
