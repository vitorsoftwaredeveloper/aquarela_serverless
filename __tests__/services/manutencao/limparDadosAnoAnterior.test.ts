import { limparDadosAnoAnteriorService } from "../../../src/services/manutencao/limparDadosAnoAnterior";
import { AgendaRepository } from "../../../src/repositories/agenda.repository";
import { MensagemRepository } from "../../../src/repositories/mensagem.repository";
import { PagamentoRepository } from "../../../src/repositories/pagamento.repository";
import { MensalidadeRepository } from "../../../src/repositories/mensalidade.repository";
import { removerAnexosDoBucket } from "../../../src/services/mensagens/anexosCleanup";
import { gerarRelatorioAnualService } from "../../../src/services/relatorios/gerarRelatorioAnual";

jest.mock("../../../src/libs/mongo", () => ({ db: jest.fn() }));
jest.mock("../../../src/repositories/agenda.repository", () => ({
  AgendaRepository: { find: jest.fn(), model: { deleteMany: jest.fn() } },
}));
jest.mock("../../../src/repositories/mensagem.repository", () => ({
  MensagemRepository: { find: jest.fn(), model: { deleteMany: jest.fn() } },
}));
jest.mock("../../../src/repositories/pagamento.repository", () => ({
  PagamentoRepository: { model: { aggregate: jest.fn(), deleteMany: jest.fn() } },
}));
jest.mock("../../../src/repositories/mensalidade.repository", () => ({
  MensalidadeRepository: { model: { deleteMany: jest.fn() } },
}));
jest.mock("../../../src/services/mensagens/anexosCleanup", () => ({
  removerAnexosDoBucket: jest.fn(),
}));
jest.mock("../../../src/services/relatorios/gerarRelatorioAnual", () => ({
  gerarRelatorioAnualService: jest.fn(),
}));

const anoAtual = new Date().getUTCFullYear();
const limite = new Date(Date.UTC(anoAtual, 0, 1));

describe("limparDadosAnoAnteriorService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AgendaRepository.find as jest.Mock).mockResolvedValue([]);
    (MensagemRepository.find as jest.Mock).mockResolvedValue([]);
    (PagamentoRepository.model.aggregate as jest.Mock).mockResolvedValue([]);
    (AgendaRepository.model.deleteMany as jest.Mock).mockResolvedValue({
      deletedCount: 0,
    });
    (MensagemRepository.model.deleteMany as jest.Mock).mockResolvedValue({
      deletedCount: 0,
    });
    (PagamentoRepository.model.deleteMany as jest.Mock).mockResolvedValue({
      deletedCount: 0,
    });
  });

  it("expurga agendas, mensagens e pagamentos anteriores a 1º de janeiro do ano atual", async () => {
    await limparDadosAnoAnteriorService();

    expect(AgendaRepository.model.deleteMany).toHaveBeenCalledWith({
      data: { $lt: limite },
    });
    expect(MensagemRepository.model.deleteMany).toHaveBeenCalledWith({
      createdAt: { $lt: limite },
    });
    expect(PagamentoRepository.model.deleteMany).toHaveBeenCalledWith({
      status: "pago",
      pagoEm: { $lt: limite },
    });
  });

  it("apaga pagamento por `pagoEm`, não por `createdAt`: PIX de dezembro pago em janeiro fica", async () => {
    await limparDadosAnoAnteriorService();

    const filtroPagamentos = (PagamentoRepository.model.deleteMany as jest.Mock)
      .mock.calls[0][0];
    // `createdAt` pegaria a cobrança gerada em dezembro e baixada no ano novo —
    // dinheiro do caixa corrente, e que nenhum fechamento consolidou.
    expect(filtroPagamentos).not.toHaveProperty("createdAt");
    expect(filtroPagamentos.pagoEm).toEqual({ $lt: limite });
  });

  it("só apaga pagamento com baixa — o não pago é do cron removerPagamentosNaoPagos", async () => {
    await limparDadosAnoAnteriorService();

    const filtroPagamentos = (PagamentoRepository.model.deleteMany as jest.Mock)
      .mock.calls[0][0];
    expect(filtroPagamentos.status).toBe("pago");
  });

  it("nunca toca em mensalidades — o cron gerarMensalidadesAno roda no mesmo horário", async () => {
    await limparDadosAnoAnteriorService();

    const colecoesApagadas = [
      AgendaRepository.model.deleteMany,
      MensagemRepository.model.deleteMany,
      PagamentoRepository.model.deleteMany,
    ];
    for (const deleteMany of colecoesApagadas) {
      expect(deleteMany).toHaveBeenCalledTimes(1);
    }
    expect(MensalidadeRepository.model.deleteMany).not.toHaveBeenCalled();
  });

  it("consolida o fechamento de cada ano com pagamento antigo antes de apagar", async () => {
    (PagamentoRepository.model.aggregate as jest.Mock).mockResolvedValue([
      { _id: 2025 },
      { _id: 2024 },
    ]);
    const chamadas: string[] = [];
    (gerarRelatorioAnualService as jest.Mock).mockImplementation(
      async (ano: number) => {
        chamadas.push(`relatorio-${ano}`);
      },
    );
    (PagamentoRepository.model.deleteMany as jest.Mock).mockImplementation(
      async () => {
        chamadas.push("deleteMany");
        return { deletedCount: 3 };
      },
    );

    const resultado = await limparDadosAnoAnteriorService();

    expect(gerarRelatorioAnualService).toHaveBeenCalledWith(2024);
    expect(gerarRelatorioAnualService).toHaveBeenCalledWith(2025);
    expect(chamadas).toEqual([
      "relatorio-2024",
      "relatorio-2025",
      "deleteMany",
    ]);
    expect(resultado.anosConsolidados).toEqual([2024, 2025]);
  });

  it("busca agendas e mensagens antes de apagá-las, para não perder os anexos a limpar", async () => {
    const chamadas: string[] = [];
    (AgendaRepository.find as jest.Mock).mockImplementation(async () => {
      chamadas.push("agendas.find");
      return [];
    });
    (MensagemRepository.find as jest.Mock).mockImplementation(async () => {
      chamadas.push("mensagens.find");
      return [];
    });
    (AgendaRepository.model.deleteMany as jest.Mock).mockImplementation(
      async () => {
        chamadas.push("agendas.deleteMany");
        return { deletedCount: 0 };
      },
    );
    (MensagemRepository.model.deleteMany as jest.Mock).mockImplementation(
      async () => {
        chamadas.push("mensagens.deleteMany");
        return { deletedCount: 0 };
      },
    );

    await limparDadosAnoAnteriorService();

    expect(chamadas.indexOf("agendas.find")).toBeLessThan(
      chamadas.indexOf("agendas.deleteMany"),
    );
    expect(chamadas.indexOf("mensagens.find")).toBeLessThan(
      chamadas.indexOf("mensagens.deleteMany"),
    );
  });

  it("remove do bucket os anexos das agendas e mensagens antigas", async () => {
    const agendas = [{ anexos: [{ key: "agendas/a.jpg" }] }];
    const mensagens = [{ anexos: [{ key: "mensagens/c.png" }] }];
    (AgendaRepository.find as jest.Mock).mockResolvedValue(agendas);
    (MensagemRepository.find as jest.Mock).mockResolvedValue(mensagens);

    await limparDadosAnoAnteriorService();

    expect(removerAnexosDoBucket).toHaveBeenCalledTimes(2);
    expect(removerAnexosDoBucket).toHaveBeenCalledWith(agendas[0].anexos);
    expect(removerAnexosDoBucket).toHaveBeenCalledWith(mensagens[0].anexos);
  });

  it("retorna a contagem de cada coleção expurgada", async () => {
    (AgendaRepository.model.deleteMany as jest.Mock).mockResolvedValue({
      deletedCount: 4,
    });
    (MensagemRepository.model.deleteMany as jest.Mock).mockResolvedValue({
      deletedCount: 7,
    });
    (PagamentoRepository.model.deleteMany as jest.Mock).mockResolvedValue({
      deletedCount: 9,
    });

    const resultado = await limparDadosAnoAnteriorService();

    expect(resultado).toEqual({
      anosConsolidados: [],
      agendasRemovidas: 4,
      mensagensRemovidas: 7,
      pagamentosRemovidos: 9,
    });
  });
});
