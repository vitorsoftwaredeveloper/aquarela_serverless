import { validarAnexoVinculado } from "../../../src/services/anexos/validarAnexoVinculado";
import { headObject } from "../../../src/libs/s3";

jest.mock("../../../src/libs/s3");

const anexo = {
  key: "mensagens/abc.pdf",
  contentType: "application/pdf",
  tamanho: 1024,
};

describe("validarAnexoVinculado", () => {
  it("aceita quando o objeto existe e bate tipo/tamanho", async () => {
    (headObject as jest.Mock).mockResolvedValue({
      contentType: "application/pdf",
      contentLength: 1024,
    });

    await expect(
      validarAnexoVinculado("mensagem", anexo),
    ).resolves.toBeUndefined();
  });

  it("rejeita key fora do prefixo do escopo (forjada/de outro escopo)", async () => {
    await expect(
      validarAnexoVinculado("agenda", anexo),
    ).rejects.toMatchObject({ code: "ANEXO_INVALIDO" });

    expect(headObject).not.toHaveBeenCalled();
  });

  it("rejeita quando o objeto não existe no bucket", async () => {
    (headObject as jest.Mock).mockResolvedValue(null);

    await expect(
      validarAnexoVinculado("mensagem", anexo),
    ).rejects.toMatchObject({ code: "ANEXO_INVALIDO" });
  });

  it("rejeita quando o content-type do objeto não bate com o declarado", async () => {
    (headObject as jest.Mock).mockResolvedValue({
      contentType: "image/png",
      contentLength: 1024,
    });

    await expect(
      validarAnexoVinculado("mensagem", anexo),
    ).rejects.toMatchObject({ code: "ANEXO_INVALIDO" });
  });

  it("rejeita quando o tamanho do objeto não bate com o declarado", async () => {
    (headObject as jest.Mock).mockResolvedValue({
      contentType: "application/pdf",
      contentLength: 2048,
    });

    await expect(
      validarAnexoVinculado("mensagem", anexo),
    ).rejects.toMatchObject({ code: "ANEXO_INVALIDO" });
  });
});
