import { removeMensagemService } from "../../../src/services/mensagens/removeMensagem";
import { MensagemRepository } from "../../../src/repositories/mensagem.repository";
import { deleteObject } from "../../../src/libs/s3";

jest.mock("../../../src/libs/mongo", () => ({ db: jest.fn() }));
jest.mock("../../../src/repositories/mensagem.repository", () => ({
  MensagemRepository: { findById: jest.fn(), deleteOne: jest.fn() },
}));
jest.mock("../../../src/libs/s3");

const mensagem = {
  _id: "msg-1",
  autorId: "autor-1",
  anexos: [
    { key: "mensagens/a.pdf", nome: "a.pdf", contentType: "application/pdf", tamanho: 10 },
  ],
};

describe("removeMensagemService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("lança 404 quando a mensagem não existe", async () => {
    (MensagemRepository.findById as jest.Mock).mockResolvedValue(null);

    await expect(
      removeMensagemService({ _id: "autor-1", papel: "professor" } as any, "msg-1"),
    ).rejects.toMatchObject({ statusCode: 404, code: "NOT_FOUND" });
  });

  it("bloqueia quem não é autor nem admin", async () => {
    (MensagemRepository.findById as jest.Mock).mockResolvedValue(mensagem);

    await expect(
      removeMensagemService(
        { _id: "outro-usuario", papel: "professor" } as any,
        "msg-1",
      ),
    ).rejects.toMatchObject({ statusCode: 403, code: "FORBIDDEN" });
    expect(MensagemRepository.deleteOne).not.toHaveBeenCalled();
  });

  it("autor remove a própria mensagem e apaga os anexos no S3", async () => {
    (MensagemRepository.findById as jest.Mock).mockResolvedValue(mensagem);

    await removeMensagemService(
      { _id: "autor-1", papel: "responsavel" } as any,
      "msg-1",
    );

    expect(MensagemRepository.deleteOne).toHaveBeenCalledWith({
      _id: "msg-1",
    });
    expect(deleteObject).toHaveBeenCalledWith("mensagens/a.pdf");
  });

  it("admin remove mensagem de outro usuário", async () => {
    (MensagemRepository.findById as jest.Mock).mockResolvedValue(mensagem);

    await removeMensagemService(
      { _id: "admin-1", papel: "admin" } as any,
      "msg-1",
    );

    expect(MensagemRepository.deleteOne).toHaveBeenCalledWith({
      _id: "msg-1",
    });
  });

  it("engole falha do S3 sem derrubar a remoção", async () => {
    (MensagemRepository.findById as jest.Mock).mockResolvedValue(mensagem);
    (deleteObject as jest.Mock).mockRejectedValue(new Error("S3 fora do ar"));

    await expect(
      removeMensagemService(
        { _id: "autor-1", papel: "responsavel" } as any,
        "msg-1",
      ),
    ).resolves.toBeUndefined();
  });
});
