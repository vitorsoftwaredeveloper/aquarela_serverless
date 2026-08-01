import { marcarMensagemLidaService } from "../../../src/services/mensagens/marcarMensagemLida";
import { MensagemRepository } from "../../../src/repositories/mensagem.repository";
import { loadCriancaParaMensagem } from "../../../src/services/shared/mensagemAccess";

jest.mock("../../../src/libs/mongo", () => ({ db: jest.fn() }));
jest.mock("../../../src/repositories/mensagem.repository", () => ({
  MensagemRepository: { findById: jest.fn(), updateOne: jest.fn() },
}));
jest.mock("../../../src/services/shared/mensagemAccess", () => ({
  loadCriancaParaMensagem: jest.fn(),
}));

const requester = { _id: "resp-1", papel: "responsavel" } as any;

describe("marcarMensagemLidaService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("lança 404 quando a mensagem não existe", async () => {
    (MensagemRepository.findById as jest.Mock).mockResolvedValue(null);

    await expect(
      marcarMensagemLidaService(requester, "msg-1"),
    ).rejects.toMatchObject({ statusCode: 404, code: "NOT_FOUND" });
    expect(MensagemRepository.updateOne).not.toHaveBeenCalled();
  });

  it("checa ownership da criança da mensagem antes de marcar", async () => {
    (MensagemRepository.findById as jest.Mock).mockResolvedValue({
      _id: "msg-1",
      criancaId: "crianca-1",
    });

    await marcarMensagemLidaService(requester, "msg-1");

    expect(loadCriancaParaMensagem).toHaveBeenCalledWith(
      requester,
      "crianca-1",
    );
  });

  it("empurra {usuarioId, lidaEm} só quando ainda não leu (idempotente)", async () => {
    (MensagemRepository.findById as jest.Mock).mockResolvedValue({
      _id: "msg-1",
      criancaId: "crianca-1",
    });

    await marcarMensagemLidaService(requester, "msg-1");

    expect(MensagemRepository.updateOne).toHaveBeenCalledWith(
      { _id: "msg-1", "lidaPor.usuarioId": { $ne: "resp-1" } },
      {
        $push: {
          lidaPor: { usuarioId: "resp-1", lidaEm: expect.any(Date) },
        },
      },
    );
  });
});
