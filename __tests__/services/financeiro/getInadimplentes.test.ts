import { getInadimplentesService } from "../../../src/services/financeiro/getInadimplentes";
import { MensalidadeRepository } from "../../../src/repositories/mensalidade.repository";
import { CriancaRepository } from "../../../src/repositories/crianca.repository";

jest.mock("../../../src/repositories/mensalidade.repository", () => ({
  MensalidadeRepository: { find: jest.fn() },
}));
jest.mock("../../../src/repositories/crianca.repository", () => ({
  CriancaRepository: { find: jest.fn() },
}));

describe("getInadimplentesService", () => {
  beforeEach(() => jest.clearAllMocks());

  it("filtra por inadimplenteDesde, não por status", async () => {
    (MensalidadeRepository.find as jest.Mock).mockResolvedValue([]);

    await getInadimplentesService();

    expect(MensalidadeRepository.find).toHaveBeenCalledWith(
      { inadimplenteDesde: { $ne: null } },
      null,
      { sort: { inadimplenteDesde: 1 } },
    );
  });

  it("mensalidade atrasado-mas-dentro-da-carência (sem inadimplenteDesde) não aparece — o mock já garante isso via filtro, aqui só confirmamos o formato do retorno quando há inadimplente", async () => {
    (MensalidadeRepository.find as jest.Mock).mockResolvedValue([
      {
        _id: "m1",
        criancaId: "c1",
        valor: 500,
        inadimplenteDesde: new Date("2026-09-10T03:00:00.000Z"),
      },
    ]);
    (CriancaRepository.find as jest.Mock).mockResolvedValue([
      { _id: "c1", nome: "Sofia", responsaveis: [] },
    ]);

    const resultado = await getInadimplentesService();

    expect(resultado).toEqual([
      {
        mensalidade: {
          _id: "m1",
          criancaId: "c1",
          valor: 500,
          inadimplenteDesde: new Date("2026-09-10T03:00:00.000Z"),
        },
        crianca: { _id: "c1", nome: "Sofia", responsaveis: [] },
      },
    ]);
  });

  it("devolve lista vazia sem consultar crianças quando não há inadimplente", async () => {
    (MensalidadeRepository.find as jest.Mock).mockResolvedValue([]);

    const resultado = await getInadimplentesService();

    expect(resultado).toEqual([]);
    expect(CriancaRepository.find).not.toHaveBeenCalled();
  });
});
