import { updateCriancaService } from "../../../src/services/criancas/updateCrianca";
import { CriancaRepository } from "../../../src/repositories/crianca.repository";
import {
  removerFotoDoBucket,
  salvarFotoBase64,
} from "../../../src/services/shared/fotoCrianca";
import { sincronizarMensalidadesNaoPagas } from "../../../src/services/mensalidades/sincronizarMensalidadesNaoPagas";

jest.mock("../../../src/repositories/crianca.repository");
jest.mock(
  "../../../src/services/mensalidades/sincronizarMensalidadesNaoPagas",
  () => ({ sincronizarMensalidadesNaoPagas: jest.fn() }),
);
jest.mock("../../../src/services/shared/fotoCrianca", () => ({
  salvarFotoBase64: jest.fn(),
  removerFotoDoBucket: jest.fn(),
  withFotoUrl: jest.fn(async (crianca: any) => crianca),
}));

const admin = { _id: "admin-1", papel: "admin" } as any;
const responsavel = {
  _id: "usuario-9",
  papel: "responsavel",
  criancasVinculadas: ["crianca-1"],
} as any;

const FOTO = { contentType: "image/jpeg", base64: "AAAA" } as any;

const mockCrianca = (extra: Record<string, unknown> = {}) =>
  (CriancaRepository.findById as jest.Mock).mockResolvedValue({
    _id: "crianca-1",
    nome: "Diego",
    responsaveis: [{ usuarioId: "usuario-9", nome: "Ana", cpf: "1" }],
    auditoria: [],
    ...extra,
  });

describe("updateCriancaService", () => {
  beforeEach(() => {
    mockCrianca();
    (salvarFotoBase64 as jest.Mock).mockResolvedValue(
      "criancas/crianca-1/nova.jpg",
    );
  });

  it("grava a nova foto, audita e apaga a anterior", async () => {
    mockCrianca({ foto: "criancas/crianca-1/antiga.jpg" });

    await updateCriancaService(admin, "crianca-1", { foto: FOTO });

    const [, update] = (CriancaRepository.updateOne as jest.Mock).mock.calls[0];
    expect(update.$set.foto).toBe("criancas/crianca-1/nova.jpg");
    expect(update.$set.auditoria[0]).toMatchObject({
      usuarioId: "admin-1",
      campos: ["foto"],
    });
    expect(removerFotoDoBucket).toHaveBeenCalledWith(
      "criancas/crianca-1/antiga.jpg",
    );
  });

  it("não grava o objeto base64 no documento", async () => {
    await updateCriancaService(admin, "crianca-1", {
      nome: "Diego Souza",
      foto: FOTO,
    });

    const [, update] = (CriancaRepository.updateOne as jest.Mock).mock.calls[0];
    expect(update.$set.foto).toBe("criancas/crianca-1/nova.jpg");
    expect(update.$set.nome).toBe("Diego Souza");
  });

  it("preserva o cadastro quando o upload da foto falha", async () => {
    mockCrianca({ foto: "criancas/crianca-1/antiga.jpg" });
    (salvarFotoBase64 as jest.Mock).mockRejectedValue(
      Object.assign(new Error("tipo inválido"), { statusCode: 422 }),
    );

    await expect(
      updateCriancaService(admin, "crianca-1", { foto: FOTO }),
    ).rejects.toMatchObject({ statusCode: 422 });

    expect(CriancaRepository.updateOne).not.toHaveBeenCalled();
    expect(removerFotoDoBucket).not.toHaveBeenCalled();
  });

  it("propaga o novo financeiro para as mensalidades não pagas", async () => {
    mockCrianca({ financeiro: { valorMensalidade: 750, diaVencimento: 5 } });

    await updateCriancaService(admin, "crianca-1", {
      financeiro: { valorMensalidade: 1, diaVencimento: 5 },
    });

    expect(sincronizarMensalidadesNaoPagas).toHaveBeenCalledWith("crianca-1", {
      valorMensalidade: 1,
      diaVencimento: 5,
    });
  });

  it("não mexe em mensalidade quando o payload não traz financeiro", async () => {
    await updateCriancaService(admin, "crianca-1", { nome: "Diego Souza" });

    expect(sincronizarMensalidadesNaoPagas).not.toHaveBeenCalled();
  });

  describe("responsável", () => {
    it("edita o próprio filho", async () => {
      await updateCriancaService(responsavel, "crianca-1", {
        saude: { alergias: ["amendoim"] },
        foto: FOTO,
      });

      expect(CriancaRepository.updateOne).toHaveBeenCalled();
    });

    it("é barrado em financeiro (evita baixar a própria mensalidade)", async () => {
      await expect(
        updateCriancaService(responsavel, "crianca-1", {
          financeiro: { valorMensalidade: 1, diaVencimento: 5 },
        }),
      ).rejects.toMatchObject({ statusCode: 403, code: "FORBIDDEN" });

      expect(CriancaRepository.updateOne).not.toHaveBeenCalled();
    });

    it("é barrado em criança de terceiro", async () => {
      mockCrianca({ _id: "crianca-2", responsaveis: [] });

      await expect(
        updateCriancaService(responsavel, "crianca-2", { nome: "Outro" }),
      ).rejects.toMatchObject({ statusCode: 403 });
    });
  });

  it("404 quando a criança não existe", async () => {
    (CriancaRepository.findById as jest.Mock).mockResolvedValue(null);

    await expect(
      updateCriancaService(admin, "crianca-1", { nome: "X" }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});
