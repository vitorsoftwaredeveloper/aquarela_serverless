import { updateCriancaService } from "../../../src/services/criancas/updateCrianca";
import { CriancaRepository } from "../../../src/repositories/crianca.repository";
import { UsuarioRepository } from "../../../src/repositories/usuario.repository";
import { createUsuarioService } from "../../../src/services/usuarios/createUsuario";
import {
  removerFotoDoBucket,
  salvarFotoBase64,
} from "../../../src/services/shared/fotoCrianca";
import { sincronizarMensalidadesNaoPagas } from "../../../src/services/mensalidades/sincronizarMensalidadesNaoPagas";

jest.mock("../../../src/repositories/crianca.repository");
jest.mock("../../../src/repositories/usuario.repository");
jest.mock("../../../src/services/usuarios/createUsuario", () => ({
  createUsuarioService: jest.fn(),
}));
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
    (UsuarioRepository.findOne as jest.Mock).mockResolvedValue(null);
    (UsuarioRepository.updateOne as jest.Mock).mockResolvedValue(undefined);
    (createUsuarioService as jest.Mock).mockResolvedValue({
      _id: "usuario-novo",
      nome: "Beatriz",
      email: "bia@example.com",
      papel: "responsavel",
      senhaTemporaria: "Temp123!",
    });
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

    describe("mutação de responsaveis (OPS-01)", () => {
      const anaComUsuario = {
        usuarioId: "usuario-9",
        nome: "Ana",
        cpf: "529.982.247-25",
        parentesco: "Mãe",
        telefone: "11999990000",
        email: "ana@example.com",
        podeRetirar: false,
      };
      const avoSemUsuario = {
        nome: "Beatriz",
        cpf: "111.444.777-35",
        parentesco: "Avó",
        telefone: "11999991111",
        email: "bia@example.com",
        podeRetirar: false,
      };

      it("adicionar um novo responsável é barrado, mesmo com podeRetirar:false", async () => {
        mockCrianca({ responsaveis: [anaComUsuario] });

        await expect(
          updateCriancaService(responsavel, "crianca-1", {
            responsaveis: [anaComUsuario, avoSemUsuario],
          }),
        ).rejects.toMatchObject({
          statusCode: 403,
          code: "RESPONSAVEL_EXCLUSIVO_ADMIN",
        });

        expect(CriancaRepository.updateOne).not.toHaveBeenCalled();
      });

      it("adicionar um novo responsável com podeRetirar:true também é barrado", async () => {
        mockCrianca({ responsaveis: [anaComUsuario] });

        await expect(
          updateCriancaService(responsavel, "crianca-1", {
            responsaveis: [
              anaComUsuario,
              { ...avoSemUsuario, podeRetirar: true },
            ],
          }),
        ).rejects.toMatchObject({
          statusCode: 403,
          code: "RESPONSAVEL_EXCLUSIVO_ADMIN",
        });

        expect(CriancaRepository.updateOne).not.toHaveBeenCalled();
      });

      it("alterar podeRetirar de false para true é barrado", async () => {
        mockCrianca({ responsaveis: [anaComUsuario] });

        await expect(
          updateCriancaService(responsavel, "crianca-1", {
            responsaveis: [{ ...anaComUsuario, podeRetirar: true }],
          }),
        ).rejects.toMatchObject({
          statusCode: 403,
          code: "PODE_RETIRAR_EXCLUSIVO_ADMIN",
        });
      });

      it("alterar podeRetirar de true para false também é barrado", async () => {
        mockCrianca({
          responsaveis: [{ ...anaComUsuario, podeRetirar: true }],
        });

        await expect(
          updateCriancaService(responsavel, "crianca-1", {
            responsaveis: [{ ...anaComUsuario, podeRetirar: false }],
          }),
        ).rejects.toMatchObject({
          statusCode: 403,
          code: "PODE_RETIRAR_EXCLUSIVO_ADMIN",
        });
      });

      it("remover entrada com podeRetirar:true é barrado", async () => {
        mockCrianca({
          responsaveis: [
            { ...anaComUsuario, podeRetirar: true },
            avoSemUsuario,
          ],
        });

        await expect(
          updateCriancaService(responsavel, "crianca-1", {
            responsaveis: [avoSemUsuario],
          }),
        ).rejects.toMatchObject({
          statusCode: 403,
          code: "PODE_RETIRAR_EXCLUSIVO_ADMIN",
        });
      });

      it("remover entrada com podeRetirar:false passa", async () => {
        mockCrianca({ responsaveis: [anaComUsuario, avoSemUsuario] });

        await updateCriancaService(responsavel, "crianca-1", {
          responsaveis: [anaComUsuario],
        });

        expect(CriancaRepository.updateOne).toHaveBeenCalled();
      });

      it("alterar usuarioId de uma entrada é barrado", async () => {
        mockCrianca({ responsaveis: [avoSemUsuario] });

        await expect(
          updateCriancaService(responsavel, "crianca-1", {
            responsaveis: [{ ...avoSemUsuario, usuarioId: "usuario-novo" }],
          }),
        ).rejects.toMatchObject({
          statusCode: 403,
          code: "PODE_RETIRAR_EXCLUSIVO_ADMIN",
        });
      });

      it("editar nome/telefone/cpf de uma entrada passa", async () => {
        mockCrianca({ responsaveis: [anaComUsuario] });

        await updateCriancaService(responsavel, "crianca-1", {
          responsaveis: [
            {
              ...anaComUsuario,
              nome: "Ana Souza",
              telefone: "11988887777",
              cpf: "529.982.247-25",
            },
          ],
        });

        expect(CriancaRepository.updateOne).toHaveBeenCalled();
      });

      it("reordenar o array não muda o resultado (casamento não é por índice)", async () => {
        mockCrianca({
          responsaveis: [
            { ...anaComUsuario, podeRetirar: true },
            avoSemUsuario,
          ],
        });

        await updateCriancaService(responsavel, "crianca-1", {
          responsaveis: [
            avoSemUsuario,
            { ...anaComUsuario, podeRetirar: true },
          ],
        });

        expect(CriancaRepository.updateOne).toHaveBeenCalled();
      });

      it("admin pode conceder podeRetirar livremente", async () => {
        mockCrianca({ responsaveis: [anaComUsuario] });

        await updateCriancaService(admin, "crianca-1", {
          responsaveis: [{ ...anaComUsuario, podeRetirar: true }],
        });

        expect(CriancaRepository.updateOne).toHaveBeenCalled();
      });

      it("admin pode adicionar um novo responsável livremente", async () => {
        mockCrianca({ responsaveis: [anaComUsuario] });

        await updateCriancaService(admin, "crianca-1", {
          responsaveis: [anaComUsuario, avoSemUsuario],
        });

        expect(CriancaRepository.updateOne).toHaveBeenCalled();
      });

      describe("acesso automático (novo responsável no admin)", () => {
        it("cria o usuário e devolve a senha temporária em acessosResponsaveis", async () => {
          mockCrianca({ responsaveis: [anaComUsuario] });

          const resultado = await updateCriancaService(admin, "crianca-1", {
            responsaveis: [anaComUsuario, avoSemUsuario],
          });

          expect(createUsuarioService).toHaveBeenCalledWith({
            nome: avoSemUsuario.nome,
            email: avoSemUsuario.email,
            papel: "responsavel",
            telefone: avoSemUsuario.telefone,
          });
          expect(resultado.acessosResponsaveis).toEqual([
            {
              nome: "Beatriz",
              email: "bia@example.com",
              senhaTemporaria: "Temp123!",
            },
          ]);

          const [, update] = (CriancaRepository.updateOne as jest.Mock).mock
            .calls[0];
          expect(update.$set.responsaveis).toEqual([
            anaComUsuario,
            { ...avoSemUsuario, usuarioId: "usuario-novo" },
          ]);

          expect(UsuarioRepository.updateOne).toHaveBeenCalledWith(
            { _id: "usuario-novo" },
            { $addToSet: { criancasVinculadas: "crianca-1" } },
          );
        });

        it("reaproveita usuário existente por email, sem gerar acesso novo", async () => {
          mockCrianca({ responsaveis: [anaComUsuario] });
          (UsuarioRepository.findOne as jest.Mock).mockResolvedValue({
            _id: "usuario-existente",
            email: avoSemUsuario.email,
          });

          const resultado = await updateCriancaService(admin, "crianca-1", {
            responsaveis: [anaComUsuario, avoSemUsuario],
          });

          expect(createUsuarioService).not.toHaveBeenCalled();
          expect(resultado.acessosResponsaveis).toEqual([]);

          const [, update] = (CriancaRepository.updateOne as jest.Mock).mock
            .calls[0];
          expect(update.$set.responsaveis).toEqual([
            anaComUsuario,
            { ...avoSemUsuario, usuarioId: "usuario-existente" },
          ]);
        });

        it("não cria acesso para responsável já vinculado (mesmo CPF)", async () => {
          mockCrianca({ responsaveis: [anaComUsuario] });

          const resultado = await updateCriancaService(admin, "crianca-1", {
            responsaveis: [{ ...anaComUsuario, nome: "Ana Souza" }],
          });

          expect(createUsuarioService).not.toHaveBeenCalled();
          expect(UsuarioRepository.findOne).not.toHaveBeenCalled();
          expect(resultado.acessosResponsaveis).toEqual([]);
        });
      });
    });
  });

  it("404 quando a criança não existe", async () => {
    (CriancaRepository.findById as jest.Mock).mockResolvedValue(null);

    await expect(
      updateCriancaService(admin, "crianca-1", { nome: "X" }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});
