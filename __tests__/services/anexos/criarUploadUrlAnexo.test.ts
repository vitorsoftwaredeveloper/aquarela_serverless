import {
  buildAnexoKey,
  criarUploadUrlAnexoService,
} from "../../../src/services/anexos/criarUploadUrlAnexo";
import { ANEXO_TAMANHO_MAXIMO_BYTES } from "../../../src/services/anexos/anexoConstantes";
import { createPresignedUploadUrl } from "../../../src/libs/s3";

jest.mock("../../../src/libs/s3");

const payloadBase = {
  escopo: "mensagem" as const,
  nome: "atestado.pdf",
  contentType: "application/pdf",
  tamanho: 1024,
};

describe("criarUploadUrlAnexo", () => {
  beforeEach(() => {
    (createPresignedUploadUrl as jest.Mock).mockImplementation(
      async ({ key }: { key: string }) => `https://s3/${key}?assinada`,
    );
  });

  describe("buildAnexoKey", () => {
    it("prefixa a key pelo escopo e usa a extensão do content-type", () => {
      expect(buildAnexoKey("mensagem", "application/pdf")).toMatch(
        /^mensagens\/[0-9a-f-]{36}\.pdf$/,
      );
      expect(buildAnexoKey("agenda", "image/jpeg")).toMatch(
        /^agendas\/[0-9a-f-]{36}\.jpg$/,
      );
      expect(buildAnexoKey("mural", "image/png")).toMatch(
        /^eventos\/[0-9a-f-]{36}\.png$/,
      );
    });
  });

  describe("criarUploadUrlAnexoService", () => {
    it("emite url assinada de PUT com o tipo/tamanho fixados", async () => {
      const resultado = await criarUploadUrlAnexoService(payloadBase);

      expect(resultado.key).toMatch(/^mensagens\//);
      expect(resultado.uploadUrl).toBe(`https://s3/${resultado.key}?assinada`);
      expect(resultado.expiraEm).toBe(300);
      expect(createPresignedUploadUrl).toHaveBeenCalledWith({
        key: resultado.key,
        contentType: "application/pdf",
        contentLength: 1024,
        expiresIn: 300,
      });
    });

    it("rejeita content-type fora da whitelist", async () => {
      await expect(
        criarUploadUrlAnexoService({
          ...payloadBase,
          contentType: "application/zip",
        }),
      ).rejects.toMatchObject({ code: "TIPO_ANEXO_INVALIDO" });

      expect(createPresignedUploadUrl).not.toHaveBeenCalled();
    });

    it("rejeita acima do teto de 10MB", async () => {
      await expect(
        criarUploadUrlAnexoService({
          ...payloadBase,
          tamanho: ANEXO_TAMANHO_MAXIMO_BYTES + 1,
        }),
      ).rejects.toMatchObject({ code: "ANEXO_MUITO_GRANDE" });

      expect(createPresignedUploadUrl).not.toHaveBeenCalled();
    });
  });
});
