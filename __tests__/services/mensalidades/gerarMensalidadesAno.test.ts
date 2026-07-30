import { gerarMensalidadesAnoService } from "../../../src/services/mensalidades/gerarMensalidadesAno";
import { CriancaRepository } from "../../../src/repositories/crianca.repository";
import { criarMensalidadeSeNaoExiste } from "../../../src/services/mensalidades/criarMensalidadeSeNaoExiste";

jest.mock("../../../src/libs/mongo", () => ({ db: jest.fn() }));
jest.mock("../../../src/repositories/crianca.repository", () => ({
  CriancaRepository: { find: jest.fn() },
}));
jest.mock("../../../src/services/mensalidades/criarMensalidadeSeNaoExiste", () => ({
  criarMensalidadeSeNaoExiste: jest.fn(),
}));

const financeiro = { valorMensalidade: 500, diaVencimento: 10 };

describe("gerarMensalidadesAnoService", () => {
  beforeEach(() => jest.clearAllMocks());

  it("gera as 12 competências do ano para cada criança", async () => {
    (CriancaRepository.find as jest.Mock).mockResolvedValue([
      { _id: "crianca-1", financeiro },
      { _id: "crianca-2", financeiro },
    ]);
    (criarMensalidadeSeNaoExiste as jest.Mock).mockResolvedValue(true);

    const resultado = await gerarMensalidadesAnoService(2027);

    expect(CriancaRepository.find).toHaveBeenCalledWith({});
    expect(criarMensalidadeSeNaoExiste).toHaveBeenCalledTimes(24);
    expect(criarMensalidadeSeNaoExiste).toHaveBeenCalledWith(
      "crianca-1",
      financeiro,
      2027,
      1,
    );
    expect(criarMensalidadeSeNaoExiste).toHaveBeenCalledWith(
      "crianca-2",
      financeiro,
      2027,
      12,
    );
    expect(resultado).toEqual({ geradas: 24, ignoradas: 0 });
  });

  it("conta como ignorada quando a mensalidade já existe", async () => {
    (CriancaRepository.find as jest.Mock).mockResolvedValue([
      { _id: "crianca-1", financeiro },
    ]);
    (criarMensalidadeSeNaoExiste as jest.Mock).mockResolvedValue(false);

    const resultado = await gerarMensalidadesAnoService(2027);

    expect(resultado).toEqual({ geradas: 0, ignoradas: 12 });
  });

  it("não chama criarMensalidadeSeNaoExiste quando não há crianças ativas", async () => {
    (CriancaRepository.find as jest.Mock).mockResolvedValue([]);

    const resultado = await gerarMensalidadesAnoService(2027);

    expect(criarMensalidadeSeNaoExiste).not.toHaveBeenCalled();
    expect(resultado).toEqual({ geradas: 0, ignoradas: 0 });
  });
});
