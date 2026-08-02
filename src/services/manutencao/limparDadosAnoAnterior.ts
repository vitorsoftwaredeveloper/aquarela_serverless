import { db } from "../../libs/mongo";
import { AgendaRepository } from "../../repositories/agenda.repository";
import { MensagemRepository } from "../../repositories/mensagem.repository";
import { PagamentoRepository } from "../../repositories/pagamento.repository";
import { removerAnexosDoBucket } from "../mensagens/anexosCleanup";
import { gerarRelatorioAnualService } from "../relatorios/gerarRelatorioAnual";
import { IAgendaDiaria } from "../../types/agendas";
import { IMensagem } from "../../types/mensagens";

const TIMEZONE_BRASIL = "America/Sao_Paulo";

export interface IResultadoLimpezaAnual {
  anosConsolidados: number[];
  agendasRemovidas: number;
  mensagensRemovidas: number;
  pagamentosRemovidos: number;
}

const anosComPagamentoAte = async (limite: Date): Promise<number[]> => {
  const anos = await PagamentoRepository.model.aggregate<{ _id: number }>([
    { $match: { status: "pago", pagoEm: { $ne: null, $lt: limite } } },
    {
      $group: { _id: { $year: { date: "$pagoEm", timezone: TIMEZONE_BRASIL } } },
    },
  ]);

  return anos.map((item) => item._id).sort((a, b) => a - b);
};

/**
 * Expurgo anual de histórico. Consolida o fechamento financeiro de cada ano
 * afetado ANTES de apagar — depois do `deleteMany` os `pagamentos` não
 * existem mais e `relatoriosAnuais` vira a única fonte do histórico. Cadastro
 * da criança, mensalidades e despesas não são tocados.
 */
export const limparDadosAnoAnteriorService =
  async (): Promise<IResultadoLimpezaAnual> => {
    await db();

    const anoAtual = new Date().getUTCFullYear();
    const limite = new Date(Date.UTC(anoAtual, 0, 1));

    const anosConsolidados = await anosComPagamentoAte(limite);
    for (const ano of anosConsolidados) {
      await gerarRelatorioAnualService(ano);
    }

    const [agendas, mensagens] = await Promise.all([
      AgendaRepository.find({ data: { $lt: limite } }, { anexos: 1 }) as Promise<
        Pick<IAgendaDiaria, "anexos">[]
      >,
      MensagemRepository.find(
        { createdAt: { $lt: limite } },
        { anexos: 1 },
      ) as Promise<Pick<IMensagem, "anexos">[]>,
    ]);

    await Promise.all([
      ...agendas.map((agenda) => removerAnexosDoBucket(agenda.anexos)),
      ...mensagens.map((mensagem) => removerAnexosDoBucket(mensagem.anexos)),
    ]);

    const [agendasResultado, mensagensResultado, pagamentosResultado] =
      await Promise.all([
        AgendaRepository.model.deleteMany({ data: { $lt: limite } }),
        MensagemRepository.model.deleteMany({ createdAt: { $lt: limite } }),
        // Mesmo critério da consolidação (`pagoEm`, não `createdAt`): senão o
        // PIX gerado em dezembro e pago em janeiro cairia aqui sem estar em
        // nenhum fechamento — some do caixa do ano novo. Pagamento sem baixa
        // não é problema deste cron, o `removerPagamentosNaoPagos` diário já
        // apaga tudo que não é `pago`.
        PagamentoRepository.model.deleteMany({
          status: "pago",
          pagoEm: { $lt: limite },
        }),
      ]);

    return {
      anosConsolidados,
      agendasRemovidas: agendasResultado.deletedCount ?? 0,
      mensagensRemovidas: mensagensResultado.deletedCount ?? 0,
      pagamentosRemovidos: pagamentosResultado.deletedCount ?? 0,
    };
  };
