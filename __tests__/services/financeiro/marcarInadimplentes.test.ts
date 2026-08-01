import { marcarInadimplentesService } from "../../../src/services/financeiro/marcarInadimplentes";
import { MensalidadeRepository } from "../../../src/repositories/mensalidade.repository";
import { getConfigPrecosService } from "../../../src/services/configPrecos/getConfigPrecos";

jest.mock("../../../src/libs/mongo", () => ({ db: jest.fn() }));
jest.mock("../../../src/repositories/mensalidade.repository", () => ({
  MensalidadeRepository: {
    find: jest.fn(),
    model: { bulkWrite: jest.fn() },
  },
}));
jest.mock("../../../src/services/configPrecos/getConfigPrecos", () => ({
  getConfigPrecosService: jest.fn(),
}));

describe("marcarInadimplentesService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getConfigPrecosService as jest.Mock).mockResolvedValue({
      inadimplencia: { diaCorte: 10, mesesCarencia: 1 },
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("marca inadimplenteDesde na mensalidade que já passou do corte (dia 10 do mês seguinte à carência)", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-09-10T03:00:00.000Z")); // 10/09 00:00 GMT-3
    (MensalidadeRepository.find as jest.Mock).mockResolvedValue([
      { _id: "m1", ano: 2026, mes: 8, status: "atrasado" }, // vencimento em agosto, corte 10/09
    ]);

    const resultado = await marcarInadimplentesService();

    expect(resultado).toEqual({ marcadas: 1 });
    const [operacoes] = (MensalidadeRepository.model.bulkWrite as jest.Mock)
      .mock.calls[0];
    expect(operacoes).toEqual([
      {
        updateOne: {
          filter: { _id: "m1" },
          update: {
            $set: { inadimplenteDesde: new Date("2026-09-10T03:00:00.000Z") },
          },
        },
      },
    ]);
  });

  it("não marca antes do corte (ainda dentro da carência)", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-09-09T23:00:00.000Z")); // 09/09 20:00 GMT-3, um dia antes do corte
    (MensalidadeRepository.find as jest.Mock).mockResolvedValue([
      { _id: "m1", ano: 2026, mes: 8, status: "atrasado" },
    ]);

    const resultado = await marcarInadimplentesService();

    expect(resultado).toEqual({ marcadas: 0 });
    expect(MensalidadeRepository.model.bulkWrite).not.toHaveBeenCalled();
  });

  it("respeita rollover de ano (mês 12 + carência de 1 mês → corte em janeiro do ano seguinte)", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2027-01-10T03:00:00.000Z"));
    (MensalidadeRepository.find as jest.Mock).mockResolvedValue([
      { _id: "m1", ano: 2026, mes: 12, status: "aberto" },
    ]);

    const resultado = await marcarInadimplentesService();

    expect(resultado).toEqual({ marcadas: 1 });
    const [operacoes] = (MensalidadeRepository.model.bulkWrite as jest.Mock)
      .mock.calls[0];
    expect(
      operacoes[0].updateOne.update.$set.inadimplenteDesde,
    ).toEqual(new Date("2027-01-10T03:00:00.000Z"));
  });

  it("diaCorte configurável muda a data do corte", async () => {
    (getConfigPrecosService as jest.Mock).mockResolvedValue({
      inadimplencia: { diaCorte: 1, mesesCarencia: 0 },
    });
    jest.useFakeTimers().setSystemTime(new Date("2026-08-01T03:00:00.000Z"));
    (MensalidadeRepository.find as jest.Mock).mockResolvedValue([
      { _id: "m1", ano: 2026, mes: 8, status: "aberto" },
    ]);

    const resultado = await marcarInadimplentesService();

    expect(resultado).toEqual({ marcadas: 1 });
  });

  it("filtra apenas mensalidades ainda sem inadimplenteDesde (idempotência via query)", async () => {
    (MensalidadeRepository.find as jest.Mock).mockResolvedValue([]);

    await marcarInadimplentesService();

    expect(MensalidadeRepository.find).toHaveBeenCalledWith({
      status: { $in: ["aberto", "atrasado"] },
      inadimplenteDesde: null,
    });
    expect(MensalidadeRepository.model.bulkWrite).not.toHaveBeenCalled();
  });
});
