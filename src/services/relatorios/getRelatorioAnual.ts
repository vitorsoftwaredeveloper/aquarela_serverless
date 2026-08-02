import { db } from "../../libs/mongo";
import { RelatorioAnualRepository } from "../../repositories/relatorioAnual.repository";
import { PagamentoRepository } from "../../repositories/pagamento.repository";
import { calcularRelatorioAnual } from "./gerarRelatorioAnual";
import { IRelatorioAnual, IRelatorioAnualResponse } from "../../types/relatorios";

const TIMEZONE_BRASIL = "America/Sao_Paulo";

const listarAnosDisponiveis = async (): Promise<number[]> => {
  const [consolidados, comPagamento] = await Promise.all([
    RelatorioAnualRepository.find({}, { ano: 1 }) as Promise<{ ano: number }[]>,
    PagamentoRepository.model.aggregate<{ _id: number }>([
      { $match: { status: "pago", pagoEm: { $ne: null } } },
      {
        $group: {
          _id: { $year: { date: "$pagoEm", timezone: TIMEZONE_BRASIL } },
        },
      },
    ]),
  ]);

  const anos = new Set<number>([
    new Date().getUTCFullYear(),
    ...consolidados.map((item) => item.ano),
    ...comPagamento.map((item) => item._id),
  ]);

  return [...anos].sort((a, b) => b - a);
};

/**
 * Ano fechado pelo cron `limparDadosAnoAnterior` tem snapshot em
 * `relatoriosAnuais` e é servido de lá — os `pagamentos` daquele ano já
 * foram expurgados, então recalcular devolveria zero. Ano ainda aberto é
 * calculado ao vivo.
 */
export const getRelatorioAnualService = async (
  anoParam?: string,
): Promise<IRelatorioAnualResponse> => {
  await db();

  const ano = Number(anoParam) || new Date().getUTCFullYear();

  const [consolidado, anosDisponiveis] = await Promise.all([
    RelatorioAnualRepository.findOne({ ano }) as Promise<IRelatorioAnual | null>,
    listarAnosDisponiveis(),
  ]);

  if (consolidado) {
    return {
      ano: consolidado.ano,
      consolidadoEm: consolidado.consolidadoEm,
      totais: consolidado.totais,
      meses: consolidado.meses,
      criancas: consolidado.criancas,
      origem: "consolidado",
      anosDisponiveis,
    };
  }

  const calculado = await calcularRelatorioAnual(ano);

  return { ...calculado, origem: "calculado", anosDisponiveis };
};
