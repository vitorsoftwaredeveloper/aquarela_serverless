import { PagamentoRepository } from "../../repositories/pagamento.repository";
import { DespesaRepository } from "../../repositories/despesa.repository";
import { RelatorioAnualRepository } from "../../repositories/relatorioAnual.repository";
import { inicioMesBrasil } from "../../utils/date";
import { IRelatorioAnual, IRelatorioAnualMes } from "../../types/relatorios";

const TIMEZONE_BRASIL = "America/Sao_Paulo";
const MESES = Array.from({ length: 12 }, (_, indice) => indice + 1);

const arredondar = (valor: number): number => Math.round(valor * 100) / 100;

interface IAgregadoMes {
  _id: number;
  total: number;
  quantidade: number;
}

/**
 * Agrega os 12 meses do ano ao vivo: entradas de `pagamentos` em regime de
 * caixa (`status: "pago"` por `pagoEm`) × `despesas` por `data`, ambos no fuso
 * `America/Sao_Paulo`. Fonte única do balanço mensal — `getBalanco` e o
 * relatório anual liam o mesmo número de dois pipelines duplicados.
 */
export const agregarMesesDoAno = async (
  ano: number,
): Promise<IRelatorioAnualMes[]> => {
  const inicio = inicioMesBrasil(ano, 1);
  const fim = inicioMesBrasil(ano + 1, 1);

  const [pagamentosPorMes, despesasPorMes] = await Promise.all([
    PagamentoRepository.model.aggregate<IAgregadoMes>([
      { $match: { status: "pago", pagoEm: { $gte: inicio, $lt: fim } } },
      {
        $group: {
          _id: { $month: { date: "$pagoEm", timezone: TIMEZONE_BRASIL } },
          total: { $sum: "$valor" },
          quantidade: { $sum: 1 },
        },
      },
    ]),
    DespesaRepository.model.aggregate<IAgregadoMes>([
      { $match: { data: { $gte: inicio, $lt: fim } } },
      {
        $group: {
          _id: { $month: { date: "$data", timezone: TIMEZONE_BRASIL } },
          total: { $sum: "$valor" },
          quantidade: { $sum: 1 },
        },
      },
    ]),
  ]);

  const pagamentosPorMesMap = new Map(
    pagamentosPorMes.map((item) => [item._id, item]),
  );
  const despesasPorMesMap = new Map(
    despesasPorMes.map((item) => [item._id, item]),
  );

  return MESES.map((mes) => {
    const pagamentos = arredondar(pagamentosPorMesMap.get(mes)?.total ?? 0);
    const despesas = arredondar(despesasPorMesMap.get(mes)?.total ?? 0);
    return {
      mes,
      pagamentos,
      despesas,
      saldo: arredondar(pagamentos - despesas),
      quantidadePagamentos: pagamentosPorMesMap.get(mes)?.quantidade ?? 0,
    };
  });
};

/**
 * Os 12 meses do ano com a mesma regra de origem do relatório anual: ano já
 * fechado pelo cron `limparDadosAnoAnterior` vem do snapshot, porque os
 * `pagamentos` daquele ano foram expurgados e agregar ao vivo devolveria zero.
 */
export const getMesesDoAno = async (
  ano: number,
): Promise<{ meses: IRelatorioAnualMes[]; origem: "consolidado" | "calculado" }> => {
  const consolidado = (await RelatorioAnualRepository.findOne({
    ano,
  })) as IRelatorioAnual | null;

  if (consolidado?.meses?.length) {
    return { meses: consolidado.meses, origem: "consolidado" };
  }

  return { meses: await agregarMesesDoAno(ano), origem: "calculado" };
};
