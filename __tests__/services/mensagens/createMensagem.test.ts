import { createMensagemService } from "../../../src/services/mensagens/createMensagem";
import { MensagemRepository } from "../../../src/repositories/mensagem.repository";
import { TurmaRepository } from "../../../src/repositories/turma.repository";
import { ProfessorRepository } from "../../../src/repositories/professor.repository";
import { loadCriancaParaMensagem } from "../../../src/services/shared/mensagemAccess";
import { validarAnexosVinculados } from "../../../src/services/anexos/validarAnexoVinculado";
import { enviarNotificacao } from "../../../src/services/notificacoes/enviarNotificacao";
import { getFotosBucket } from "../../../src/libs/s3";

jest.mock("../../../src/libs/mongo", () => ({ db: jest.fn() }));
jest.mock("../../../src/repositories/mensagem.repository", () => ({
  MensagemRepository: { insertOne: jest.fn(), findById: jest.fn() },
}));
jest.mock("../../../src/repositories/turma.repository", () => ({
  TurmaRepository: { findById: jest.fn() },
}));
jest.mock("../../../src/repositories/professor.repository", () => ({
  ProfessorRepository: { findById: jest.fn() },
}));
jest.mock("../../../src/services/shared/mensagemAccess", () => ({
  loadCriancaParaMensagem: jest.fn(),
}));
jest.mock("../../../src/services/anexos/validarAnexoVinculado", () => ({
  validarAnexosVinculados: jest.fn(),
}));
jest.mock("../../../src/services/notificacoes/enviarNotificacao", () => ({
  enviarNotificacao: jest.fn(),
}));
jest.mock("../../../src/libs/s3");

const criancaComTurma = {
  _id: "crianca-1",
  nome: "Sofia",
  turmaId: "turma-1",
  responsaveis: [{ usuarioId: "resp-1" }, { usuarioId: null }],
};

describe("createMensagemService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getFotosBucket as jest.Mock).mockReturnValue(undefined);
    (loadCriancaParaMensagem as jest.Mock).mockResolvedValue(criancaComTurma);
    (MensagemRepository.insertOne as jest.Mock).mockResolvedValue({
      _id: "msg-1",
    });
    (MensagemRepository.findById as jest.Mock).mockResolvedValue({
      _id: "msg-1",
      criancaId: "crianca-1",
      anexos: [],
    });
  });

  it("responsável envia: notifica o professor da turma da criança", async () => {
    (TurmaRepository.findById as jest.Mock).mockResolvedValue({
      _id: "turma-1",
      professorId: "professor-doc-1",
    });
    (ProfessorRepository.findById as jest.Mock).mockResolvedValue({
      _id: "professor-doc-1",
      usuarioId: "usuario-professor-1",
    });

    const requester = { _id: "resp-1", papel: "responsavel", nome: "Maria" } as any;
    await createMensagemService(requester, {
      criancaId: "crianca-1",
      corpo: "Oi professora",
    });

    expect(enviarNotificacao).toHaveBeenCalledWith(
      ["usuario-professor-1"],
      expect.objectContaining({ corpo: "Novo recado sobre Sofia" }),
    );
    expect(MensagemRepository.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        criancaId: "crianca-1",
        turmaId: "turma-1",
        autorId: "resp-1",
        autorNome: "Maria",
        autorPapel: "responsavel",
        anexos: [],
      }),
    );
  });

  it("professor envia: notifica os responsáveis da criança (ignora usuarioId ausente)", async () => {
    const requester = {
      _id: "professor-1",
      papel: "professor",
      nome: "Ana",
    } as any;
    await createMensagemService(requester, {
      criancaId: "crianca-1",
      corpo: "Aviso da professora",
    });

    expect(enviarNotificacao).toHaveBeenCalledWith(
      ["resp-1"],
      expect.any(Object),
    );
  });

  it("valida anexos vinculados antes de gravar, quando houver", async () => {
    const requester = {
      _id: "professor-1",
      papel: "professor",
      nome: "Ana",
    } as any;
    const anexos = [
      { key: "mensagens/a.pdf", nome: "a.pdf", contentType: "application/pdf", tamanho: 10 },
    ];

    await createMensagemService(requester, {
      criancaId: "crianca-1",
      corpo: "Segue o atestado",
      anexos,
    });

    expect(validarAnexosVinculados).toHaveBeenCalledWith("mensagem", anexos);
  });

  it("não notifica ninguém quando a criança não tem turma e quem envia é o responsável", async () => {
    (loadCriancaParaMensagem as jest.Mock).mockResolvedValue({
      ...criancaComTurma,
      turmaId: undefined,
    });

    const requester = { _id: "resp-1", papel: "responsavel", nome: "Maria" } as any;
    await createMensagemService(requester, {
      criancaId: "crianca-1",
      corpo: "Oi",
    });

    expect(enviarNotificacao).toHaveBeenCalledWith([], expect.any(Object));
  });

  it("mensagem já foi salva: falha ao notificar não derruba a criação", async () => {
    (TurmaRepository.findById as jest.Mock).mockResolvedValue({
      _id: "turma-1",
      professorId: "professor-doc-1",
    });
    (ProfessorRepository.findById as jest.Mock).mockResolvedValue({
      _id: "professor-doc-1",
      usuarioId: "usuario-professor-1",
    });
    (enviarNotificacao as jest.Mock).mockRejectedValue(
      new Error("Firebase fora do ar"),
    );

    const requester = { _id: "resp-1", papel: "responsavel", nome: "Maria" } as any;
    const resultado = await createMensagemService(requester, {
      criancaId: "crianca-1",
      corpo: "Oi professora",
    });

    expect(resultado).toMatchObject({ _id: "msg-1" });
    expect(MensagemRepository.insertOne).toHaveBeenCalledTimes(1);
  });
});
