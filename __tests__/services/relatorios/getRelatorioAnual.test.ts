import { getRelatorioAnualService } from "../../../src/services/relatorios/getRelatorioAnual";
import { RelatorioAnualRepository } from "../../../src/repositories/relatorioAnual.repository";
import { PagamentoRepository } from "../../../src/repositories/pagamento.repository";
import { calcularRelatorioAnual } from "../../../src/services/relatorios/gerarRelatorioAnual";

jest.mock("../../../src/libs/mongo", () => ({ db: jest.fn() }));
jest.mock("../../../src/repositories/relatorioAnual.repository", () => ({
  RelatorioAnualRepository: { find: jest.fn(), findOne: jest.fn() },
}));
jest.mock("../../../src/repositories/pagamento.repository", () => ({
  PagamentoRepository: { model: { aggregate: jest.fn() } },
}));
jest.mock("../../../src/services/relatorios/gerarRelatorioAnual", () => ({
  calcularRelatorioAnual: jest.fn(),
}));

const consolidado = {
  _id: "rel-1",
  ano: 2025,
  consolidadoEm: new Date("2026-01-01T03:00:00Z"),
  totais: {
    pagamentos: 120000,
    despesas: 80000,
    saldo: 40000,
    quantidadePagamentos: 240,
    criancasComPagamento: 20,
    ticketMedio: 500,
  },
  meses: [],
  criancas: [],
};

describe("getRelatorioAnualService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (RelatorioAnualRepository.find as jest.Mock).mockResolvedValue([]);
    (RelatorioAnualRepository.findOne as jest.Mock).mockResolvedValue(null);
    (PagamentoRepository.model.aggregate as jest.Mock).mockResolvedValue([]);
    (calcularRelatorioAnual as jest.Mock).mockResolvedValue({
      ano: 2026,
      consolidadoEm: new Date(),
      totais: {},
      meses: [],
      criancas: [],
    });
  });

  it("serve o snapshot quando o ano já foi fechado, sem recalcular", async () => {
    (RelatorioAnualRepository.findOne as jest.Mock).mockResolvedValue(
      consolidado,
    );

    const resultado = await getRelatorioAnualService("2025");

    expect(calcularRelatorioAnual).not.toHaveBeenCalled();
    expect(resultado.origem).toBe("consolidado");
    expect(resultado.totais).toEqual(consolidado.totais);
  });

  it("calcula ao vivo quando o ano ainda não foi fechado", async () => {
    const resultado = await getRelatorioAnualService("2026");

    expect(calcularRelatorioAnual).toHaveBeenCalledWith(2026);
    expect(resultado.origem).toBe("calculado");
  });

  it("usa o ano corrente quando o parâmetro vem ausente ou inválido", async () => {
    const anoAtual = new Date().getUTCFullYear();

    await getRelatorioAnualService(undefined);
    await getRelatorioAnualService("abc");

    expect(calcularRelatorioAnual).toHaveBeenNthCalledWith(1, anoAtual);
    expect(calcularRelatorioAnual).toHaveBeenNthCalledWith(2, anoAtual);
  });

  it("lista anos consolidados, anos com pagamento e o ano corrente, do mais novo pro mais velho", async () => {
    (RelatorioAnualRepository.find as jest.Mock).mockResolvedValue([
      { ano: 2024 },
      { ano: 2023 },
    ]);
    (PagamentoRepository.model.aggregate as jest.Mock).mockResolvedValue([
      { _id: 2025 },
      { _id: 2024 },
    ]);
    const anoAtual = new Date().getUTCFullYear();

    const resultado = await getRelatorioAnualService("2025");

    expect(resultado.anosDisponiveis).toEqual(
      [...new Set([anoAtual, 2025, 2024, 2023])].sort((a, b) => b - a),
    );
  });
});
