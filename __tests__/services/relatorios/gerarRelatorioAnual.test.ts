import {
  calcularRelatorioAnual,
  gerarRelatorioAnualService,
} from "../../../src/services/relatorios/gerarRelatorioAnual";
import { PagamentoRepository } from "../../../src/repositories/pagamento.repository";
import { DespesaRepository } from "../../../src/repositories/despesa.repository";
import { CriancaRepository } from "../../../src/repositories/crianca.repository";
import { TurmaRepository } from "../../../src/repositories/turma.repository";
import { RelatorioAnualRepository } from "../../../src/repositories/relatorioAnual.repository";

jest.mock("../../../src/libs/mongo", () => ({ db: jest.fn() }));
jest.mock("../../../src/repositories/pagamento.repository", () => ({
  PagamentoRepository: { model: { aggregate: jest.fn() } },
}));
jest.mock("../../../src/repositories/despesa.repository", () => ({
  DespesaRepository: { model: { aggregate: jest.fn() } },
}));
jest.mock("../../../src/repositories/crianca.repository", () => ({
  CriancaRepository: { find: jest.fn() },
}));
jest.mock("../../../src/repositories/turma.repository", () => ({
  TurmaRepository: { find: jest.fn() },
}));
jest.mock("../../../src/repositories/relatorioAnual.repository", () => ({
  RelatorioAnualRepository: { updateOne: jest.fn(), findOne: jest.fn() },
}));

const mockAgregacoes = (options: {
  pagamentosPorMes?: unknown[];
  despesasPorMes?: unknown[];
  pagamentosPorCriancaMes?: unknown[];
}) => {
  (PagamentoRepository.model.aggregate as jest.Mock)
    .mockResolvedValueOnce(options.pagamentosPorMes ?? [])
    .mockResolvedValueOnce(options.pagamentosPorCriancaMes ?? []);
  (DespesaRepository.model.aggregate as jest.Mock).mockResolvedValue(
    options.despesasPorMes ?? [],
  );
};

describe("calcularRelatorioAnual", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (CriancaRepository.find as jest.Mock).mockResolvedValue([]);
    (TurmaRepository.find as jest.Mock).mockResolvedValue([]);
  });

  it("devolve os 12 meses mesmo quando não houve movimento", async () => {
    mockAgregacoes({});

    const relatorio = await calcularRelatorioAnual(2025);

    expect(relatorio.meses).toHaveLength(12);
    expect(relatorio.meses[0]).toEqual({
      mes: 1,
      pagamentos: 0,
      despesas: 0,
      saldo: 0,
      quantidadePagamentos: 0,
    });
    expect(relatorio.totais.ticketMedio).toBe(0);
  });

  it("soma pagamentos e despesas do ano e calcula saldo, total e ticket médio", async () => {
    mockAgregacoes({
      pagamentosPorMes: [
        { _id: 1, total: 1000, quantidade: 2 },
        { _id: 2, total: 500, quantidade: 1 },
      ],
      despesasPorMes: [{ _id: 1, total: 300, quantidade: 1 }],
    });

    const relatorio = await calcularRelatorioAnual(2025);

    expect(relatorio.meses[0]).toMatchObject({
      pagamentos: 1000,
      despesas: 300,
      saldo: 700,
    });
    expect(relatorio.totais).toMatchObject({
      pagamentos: 1500,
      despesas: 300,
      saldo: 1200,
      quantidadePagamentos: 3,
      ticketMedio: 500,
    });
  });

  it("quebra os valores por criança e mês, ordenando por nome", async () => {
    mockAgregacoes({
      pagamentosPorMes: [{ _id: 3, total: 900, quantidade: 3 }],
      pagamentosPorCriancaMes: [
        { _id: { criancaId: "c-2", mes: 3 }, total: 300, quantidade: 1 },
        { _id: { criancaId: "c-1", mes: 3 }, total: 400, quantidade: 1 },
        { _id: { criancaId: "c-1", mes: 1 }, total: 200, quantidade: 1 },
      ],
    });
    (CriancaRepository.find as jest.Mock).mockResolvedValue([
      { _id: "c-1", nome: "Zoe", turmaId: "t-1" },
      { _id: "c-2", nome: "Ana", turmaId: null },
    ]);
    (TurmaRepository.find as jest.Mock).mockResolvedValue([
      { _id: "t-1", nome: "Berçário" },
    ]);

    const relatorio = await calcularRelatorioAnual(2025);

    expect(relatorio.criancas.map((c) => c.nome)).toEqual(["Ana", "Zoe"]);
    const zoe = relatorio.criancas.find((c) => c.nome === "Zoe")!;
    expect(zoe.total).toBe(600);
    expect(zoe.turmaNome).toBe("Berçário");
    expect(zoe.meses).toEqual([
      { mes: 1, valor: 200, quantidadePagamentos: 1 },
      { mes: 3, valor: 400, quantidadePagamentos: 1 },
    ]);
    expect(relatorio.totais.criancasComPagamento).toBe(2);
  });

  it("mantém no relatório o pagamento de criança já removida do cadastro", async () => {
    mockAgregacoes({
      pagamentosPorMes: [{ _id: 5, total: 250, quantidade: 1 }],
      pagamentosPorCriancaMes: [
        { _id: { criancaId: "sumida", mes: 5 }, total: 250, quantidade: 1 },
      ],
    });

    const relatorio = await calcularRelatorioAnual(2025);

    expect(relatorio.criancas).toHaveLength(1);
    expect(relatorio.criancas[0]).toMatchObject({
      criancaId: "sumida",
      nome: "Criança removida",
      total: 250,
    });
  });
});

describe("gerarRelatorioAnualService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (CriancaRepository.find as jest.Mock).mockResolvedValue([]);
    (TurmaRepository.find as jest.Mock).mockResolvedValue([]);
    (RelatorioAnualRepository.findOne as jest.Mock).mockResolvedValue({
      ano: 2025,
    });
  });

  it("faz upsert por ano, para ser idempotente em reexecução", async () => {
    mockAgregacoes({ pagamentosPorMes: [{ _id: 1, total: 100, quantidade: 1 }] });

    await gerarRelatorioAnualService(2025);

    const [filtro, update, options] = (
      RelatorioAnualRepository.updateOne as jest.Mock
    ).mock.calls[0];
    expect(filtro).toEqual({ ano: 2025 });
    expect(update.$set).toMatchObject({ ano: 2025 });
    expect(options).toEqual({ upsert: true });
  });
});
