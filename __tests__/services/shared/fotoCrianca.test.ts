import {
  buildFotoKey,
  removerFotoDoBucket,
  salvarFotoBase64,
  validarFotoBase64,
  withFotoUrls,
} from "../../../src/services/shared/fotoCrianca";
import {
  createPresignedDownloadUrl,
  deleteObject,
  getFotosBucket,
  putObject,
} from "../../../src/libs/s3";

jest.mock("../../../src/libs/s3");

const JPEG = Buffer.concat([
  Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
  Buffer.alloc(60, 1),
]);
const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(60, 1),
]);
const WEBP = Buffer.concat([
  Buffer.from("RIFF"),
  Buffer.alloc(4, 1),
  Buffer.from("WEBP"),
  Buffer.alloc(60, 1),
]);

const comoUpload = (bytes: Buffer, contentType: any) => ({
  contentType,
  base64: bytes.toString("base64"),
});

describe("fotoCrianca", () => {
  beforeEach(() => {
    (getFotosBucket as jest.Mock).mockReturnValue("bucket-fotos");
    (createPresignedDownloadUrl as jest.Mock).mockImplementation(
      async ({ key }: { key: string }) => `https://s3/${key}?assinada`,
    );
  });

  describe("buildFotoKey", () => {
    it("prefixa a key com a criança e usa a extensão do content-type", () => {
      expect(buildFotoKey("crianca-1", "image/webp")).toMatch(
        /^criancas\/crianca-1\/[0-9a-f-]{36}\.webp$/,
      );
    });

    it("gera key nova a cada chamada (cache-busting no browser)", () => {
      expect(buildFotoKey("crianca-1", "image/jpeg")).not.toBe(
        buildFotoKey("crianca-1", "image/jpeg"),
      );
    });
  });

  describe("validarFotoBase64", () => {
    it.each([
      ["image/jpeg", JPEG],
      ["image/png", PNG],
      ["image/webp", WEBP],
    ])("aceita %s com assinatura correta", (contentType, bytes) => {
      expect(validarFotoBase64(comoUpload(bytes, contentType))).toEqual(bytes);
    });

    it("rejeita conteúdo cujos bytes não batem com o content-type declarado", () => {
      // PDF rotulado como JPEG: sem a checagem, o S3 devolveria depois esse
      // arquivo com Content-Type de imagem.
      const pdf = Buffer.from("%PDF-1.7\n...");

      expect(() =>
        validarFotoBase64(comoUpload(pdf, "image/jpeg")),
      ).toThrow(expect.objectContaining({ code: "TIPO_IMAGEM_INVALIDO" }));
    });

    it("rejeita base64 que decodifica para nada", () => {
      expect(() =>
        validarFotoBase64({ contentType: "image/jpeg", base64: "=" }),
      ).toThrow(expect.objectContaining({ code: "FOTO_INVALIDA" }));
    });

    it("rejeita acima de 2MB decodificados", () => {
      const grande = Buffer.concat([
        Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
        Buffer.alloc(2 * 1024 * 1024, 1),
      ]);

      expect(() =>
        validarFotoBase64(comoUpload(grande, "image/jpeg")),
      ).toThrow(expect.objectContaining({ code: "FOTO_MUITO_GRANDE" }));
    });
  });

  describe("salvarFotoBase64", () => {
    it("grava os bytes decodificados sob o prefixo da criança", async () => {
      const key = await salvarFotoBase64(
        "crianca-1",
        comoUpload(JPEG, "image/jpeg"),
      );

      expect(key).toMatch(/^criancas\/crianca-1\//);
      expect(putObject).toHaveBeenCalledWith({
        key,
        body: JPEG,
        contentType: "image/jpeg",
      });
    });

    it("não chega a gravar quando a validação reprova", async () => {
      await expect(
        salvarFotoBase64("crianca-1", comoUpload(PNG, "image/jpeg")),
      ).rejects.toMatchObject({ code: "TIPO_IMAGEM_INVALIDO" });

      expect(putObject).not.toHaveBeenCalled();
    });
  });

  describe("withFotoUrls", () => {
    it("assina só quem tem foto e preserva os demais campos", async () => {
      const result = await withFotoUrls([
        { _id: "c1", foto: "criancas/c1/a.jpg" } as any,
        { _id: "c2" } as any,
      ]);

      expect(result).toEqual([
        {
          _id: "c1",
          foto: "criancas/c1/a.jpg",
          fotoUrl: "https://s3/criancas/c1/a.jpg?assinada",
        },
        { _id: "c2" },
      ]);
      expect(createPresignedDownloadUrl).toHaveBeenCalledTimes(1);
    });

    it("não devolve fotoUrl quando não há bucket configurado (offline)", async () => {
      (getFotosBucket as jest.Mock).mockReturnValue(undefined);

      const result = await withFotoUrls([
        { _id: "c1", foto: "criancas/c1/a.jpg" } as any,
      ]);

      expect(result[0]).not.toHaveProperty("fotoUrl");
      expect(createPresignedDownloadUrl).not.toHaveBeenCalled();
    });
  });

  describe("removerFotoDoBucket", () => {
    it("engole falha do S3 para não derrubar a operação principal", async () => {
      (deleteObject as jest.Mock).mockRejectedValue(new Error("S3 fora do ar"));

      await expect(
        removerFotoDoBucket("criancas/c1/a.jpg"),
      ).resolves.toBeUndefined();
    });

    it("não chama o S3 sem key", async () => {
      await removerFotoDoBucket(undefined);

      expect(deleteObject).not.toHaveBeenCalled();
    });
  });
});
