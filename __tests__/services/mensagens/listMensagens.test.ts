import { listMensagensService } from "../../../src/services/mensagens/listMensagens";
import { MensagemRepository } from "../../../src/repositories/mensagem.repository";
import { loadCriancaParaMensagem } from "../../../src/services/shared/mensagemAccess";
import { getFotosBucket } from "../../../src/libs/s3";

jest.mock("../../../src/libs/mongo", () => ({ db: jest.fn() }));
jest.mock("../../../src/repositories/mensagem.repository", () => ({
  MensagemRepository: { find: jest.fn() },
}));
jest.mock("../../../src/services/shared/mensagemAccess", () => ({
  loadCriancaParaMensagem: jest.fn(),
}));
jest.mock("../../../src/libs/s3");

describe("listMensagensService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getFotosBucket as jest.Mock).mockReturnValue(undefined);
    (loadCriancaParaMensagem as jest.Mock).mockResolvedValue({
      _id: "crianca-1",
    });
    (MensagemRepository.find as jest.Mock).mockResolvedValue([]);
  });

  it("checa ownership da criança antes de listar", async () => {
    const requester = { _id: "resp-1", papel: "responsavel" } as any;

    await listMensagensService(requester, { criancaId: "crianca-1" });

    expect(loadCriancaParaMensagem).toHaveBeenCalledWith(
      requester,
      "crianca-1",
    );
  });

  it("usa limit padrão de 30 e ordena por createdAt desc", async () => {
    const requester = { _id: "resp-1", papel: "responsavel" } as any;

    await listMensagensService(requester, { criancaId: "crianca-1" });

    expect(MensagemRepository.find).toHaveBeenCalledWith(
      { criancaId: "crianca-1" },
      null,
      { sort: { createdAt: -1 }, limit: 30 },
    );
  });

  it("respeita o teto de 100 mesmo se o cliente pedir mais", async () => {
    const requester = { _id: "resp-1", papel: "responsavel" } as any;

    await listMensagensService(requester, {
      criancaId: "crianca-1",
      limit: 500,
    });

    const [, , options] = (MensagemRepository.find as jest.Mock).mock
      .calls[0];
    expect(options.limit).toBe(100);
  });

  it("filtra por antesDe quando informado (paginação por cursor)", async () => {
    const requester = { _id: "resp-1", papel: "responsavel" } as any;
    const antesDe = "2026-08-01T12:00:00.000Z";

    await listMensagensService(requester, {
      criancaId: "crianca-1",
      antesDe,
    });

    const [query] = (MensagemRepository.find as jest.Mock).mock.calls[0];
    expect(query.createdAt.$lt).toEqual(new Date(antesDe));
  });
});
