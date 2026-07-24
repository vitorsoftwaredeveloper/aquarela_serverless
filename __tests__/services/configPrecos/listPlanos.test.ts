import { listPlanosService } from "../../../src/services/configPrecos/listPlanos";
import { getConfigPrecosService } from "../../../src/services/configPrecos/getConfigPrecos";

jest.mock("../../../src/services/configPrecos/getConfigPrecos");

describe("listPlanosService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("retorna os planos de configPrecos", async () => {
    const planos = [
      { nome: "Integral", tipo: "integral", valorMensal: 1200 },
      { nome: "Meio período", tipo: "meioPeriodo", valorMensal: 800 },
    ];
    (getConfigPrecosService as jest.Mock).mockResolvedValue({
      _id: "singleton",
      planos,
    });

    const result = await listPlanosService();

    expect(result).toEqual(planos);
  });

  it("retorna array vazio quando não há configPrecos cadastrado", async () => {
    (getConfigPrecosService as jest.Mock).mockResolvedValue({
      _id: "singleton",
      planos: [],
    });

    const result = await listPlanosService();

    expect(result).toEqual([]);
  });
});
