import { getBalancoService } from "../../../src/services/financeiro/getBalanco";
import { PagamentoRepository } from "../../../src/repositories/pagamento.repository";
import { DespesaRepository } from "../../../src/repositories/despesa.repository";

jest.mock("../../../src/repositories/pagamento.repository", () => ({
  PagamentoRepository: { model: { aggregate: jest.fn() } },
}));
jest.mock("../../../src/repositories/despesa.repository", () => ({
  DespesaRepository: { model: { aggregate: jest.fn() } },
}));
jest.mock("../../../src/libs/mongo", () => ({ db: jest.fn().mockResolvedValue(undefined) }));

const mesGmt3 = (date: Date): number =>
  new Date(date.getTime() - 3 * 60 * 60 * 1000).getUTCMonth() + 1;

const simulateAggregate =
  (docs: Array<{ data: Date; valor: number }>) =>
  async (pipeline: any[]): Promise<Array<{ _id: number; total: number }>> => {
    const match = pipeline[0].$match;
    const { $gte, $lt } = match.pagoEm ?? match.data;
    const totals = new Map<number, number>();
    for (const doc of docs) {
      if (doc.data < $gte || doc.data >= $lt) continue;
      const mes = mesGmt3(doc.data);
      totals.set(mes, (totals.get(mes) ?? 0) + doc.valor);
    }
    return Array.from(totals, ([_id, total]) => ({ _id, total }));
  };

describe("getBalancoService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("conta pagamento de 31/07 23h GMT-3 em julho, mesmo pertencendo à mensalidade de agosto", async () => {
    const pagamentoTardio = {
      data: new Date("2026-08-01T02:00:00.000Z"), // 31/07/2026 23:00 GMT-3
      valor: 500,
    };
    (PagamentoRepository.model.aggregate as jest.Mock).mockImplementation(
      simulateAggregate([pagamentoTardio]),
    );
    (DespesaRepository.model.aggregate as jest.Mock).mockImplementation(
      simulateAggregate([]),
    );

    const [julho, agosto] = await Promise.all([
      getBalancoService("2026-07"),
      getBalancoService("2026-08"),
    ]);

    expect(julho[0].entradas).toBe(500);
    expect(agosto[0].entradas).toBe(0);
  });

  it("soma despesa lançada 31/07 22h GMT-3 em julho, não em agosto (bug de fuso UTC)", async () => {
    const despesaTardia = {
      data: new Date("2026-08-01T01:00:00.000Z"), // 31/07/2026 22:00 GMT-3
      valor: 120,
    };
    (PagamentoRepository.model.aggregate as jest.Mock).mockImplementation(
      simulateAggregate([]),
    );
    (DespesaRepository.model.aggregate as jest.Mock).mockImplementation(
      simulateAggregate([despesaTardia]),
    );

    const [julho, agosto] = await Promise.all([
      getBalancoService("2026-07"),
      getBalancoService("2026-08"),
    ]);

    expect(julho[0].despesas).toBe(120);
    expect(agosto[0].despesas).toBe(0);
  });

  it("calcula saldo por mês num período anual", async () => {
    (PagamentoRepository.model.aggregate as jest.Mock).mockResolvedValue([
      { _id: 3, total: 1000 },
    ]);
    (DespesaRepository.model.aggregate as jest.Mock).mockResolvedValue([
      { _id: 3, total: 400 },
    ]);

    const balanco = await getBalancoService("2026");

    expect(balanco).toHaveLength(12);
    expect(balanco[2]).toEqual({
      ano: 2026,
      mes: 3,
      entradas: 1000,
      despesas: 400,
      saldo: 600,
    });
    expect(balanco[0]).toEqual({
      ano: 2026,
      mes: 1,
      entradas: 0,
      despesas: 0,
      saldo: 0,
    });
  });
});
