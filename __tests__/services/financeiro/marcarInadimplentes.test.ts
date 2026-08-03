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

const vencimento = (iso: string) => new Date(iso);

describe("marcarInadimplentesService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getConfigPrecosService as jest.Mock).mockResolvedValue({
      inadimplencia: { diasCarencia: 10 },
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("marca inadimplenteDesde quando a carência em dias já venceu", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-08-15T03:00:00.000Z")); // 15/08 00:00 GMT-3
    (MensalidadeRepository.find as jest.Mock).mockResolvedValue([
      {
        _id: "m1",
        ano: 2026,
        mes: 8,
        status: "atrasado",
        vencimento: vencimento("2026-08-05T00:00:00.000Z"),
      },
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
            $set: { inadimplenteDesde: new Date("2026-08-15T03:00:00.000Z") },
          },
        },
      },
    ]);
  });

  it("não marca dentro da carência", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-08-14T23:00:00.000Z")); // 14/08 20:00 GMT-3
    (MensalidadeRepository.find as jest.Mock).mockResolvedValue([
      {
        _id: "m1",
        ano: 2026,
        mes: 8,
        status: "atrasado",
        vencimento: vencimento("2026-08-05T00:00:00.000Z"),
      },
    ]);

    const resultado = await marcarInadimplentesService();

    expect(resultado).toEqual({ marcadas: 0 });
    expect(MensalidadeRepository.model.bulkWrite).not.toHaveBeenCalled();
  });

  it("conta a partir do vencimento de cada criança, não de um corte comum", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-08-15T03:00:00.000Z"));
    (MensalidadeRepository.find as jest.Mock).mockResolvedValue([
      {
        _id: "vence-dia-05",
        ano: 2026,
        mes: 8,
        status: "atrasado",
        vencimento: vencimento("2026-08-05T00:00:00.000Z"),
      },
      {
        _id: "vence-dia-10",
        ano: 2026,
        mes: 8,
        status: "aberto",
        vencimento: vencimento("2026-08-10T00:00:00.000Z"),
      },
    ]);

    const resultado = await marcarInadimplentesService();

    expect(resultado).toEqual({ marcadas: 1 });
    const [operacoes] = (MensalidadeRepository.model.bulkWrite as jest.Mock)
      .mock.calls[0];
    expect(operacoes[0].updateOne.filter).toEqual({ _id: "vence-dia-05" });
  });

  it("respeita rollover de mês e de ano", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2027-01-04T03:00:00.000Z"));
    (MensalidadeRepository.find as jest.Mock).mockResolvedValue([
      {
        _id: "m1",
        ano: 2026,
        mes: 12,
        status: "aberto",
        vencimento: vencimento("2026-12-25T00:00:00.000Z"),
      },
    ]);

    const resultado = await marcarInadimplentesService();

    expect(resultado).toEqual({ marcadas: 1 });
    const [operacoes] = (MensalidadeRepository.model.bulkWrite as jest.Mock)
      .mock.calls[0];
    expect(operacoes[0].updateOne.update.$set.inadimplenteDesde).toEqual(
      new Date("2027-01-04T03:00:00.000Z"),
    );
  });

  it("diasCarencia configurável muda a data do corte", async () => {
    (getConfigPrecosService as jest.Mock).mockResolvedValue({
      inadimplencia: { diasCarencia: 0 },
    });
    jest.useFakeTimers().setSystemTime(new Date("2026-08-05T03:00:00.000Z"));
    (MensalidadeRepository.find as jest.Mock).mockResolvedValue([
      {
        _id: "m1",
        ano: 2026,
        mes: 8,
        status: "aberto",
        vencimento: vencimento("2026-08-05T00:00:00.000Z"),
      },
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
