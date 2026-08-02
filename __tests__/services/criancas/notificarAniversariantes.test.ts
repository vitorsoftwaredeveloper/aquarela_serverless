import { notificarAniversariantesService } from "../../../src/services/criancas/notificarAniversariantes";
import { CriancaRepository } from "../../../src/repositories/crianca.repository";
import { TurmaRepository } from "../../../src/repositories/turma.repository";
import { ProfessorRepository } from "../../../src/repositories/professor.repository";
import { enviarNotificacao } from "../../../src/services/notificacoes/enviarNotificacao";

jest.mock("../../../src/libs/mongo", () => ({ db: jest.fn() }));
jest.mock("../../../src/repositories/crianca.repository", () => ({
  CriancaRepository: {
    find: jest.fn(),
    model: { updateMany: jest.fn() },
  },
}));
jest.mock("../../../src/repositories/turma.repository", () => ({
  TurmaRepository: { find: jest.fn() },
}));
jest.mock("../../../src/repositories/professor.repository", () => ({
  ProfessorRepository: { find: jest.fn() },
}));
jest.mock("../../../src/services/notificacoes/enviarNotificacao", () => ({
  enviarNotificacao: jest.fn().mockResolvedValue(undefined),
}));

const AGORA = new Date("2026-08-15T12:00:00.000Z"); // 15/08 09:00 GMT-3

describe("notificarAniversariantesService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(AGORA);
    (CriancaRepository.find as jest.Mock).mockResolvedValue([]);
    (TurmaRepository.find as jest.Mock).mockResolvedValue([]);
    (ProfessorRepository.find as jest.Mock).mockResolvedValue([]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("filtra por nascimentoDiaMes de hoje (GMT-3) e não renotifica quem já foi hoje", async () => {
    await notificarAniversariantesService();

    expect(CriancaRepository.find).toHaveBeenCalledWith(
      {
        nascimentoDiaMes: "08-15",
        $or: [
          { ultimoAniversarioNotificadoEm: null },
          { ultimoAniversarioNotificadoEm: { $lt: new Date("2026-08-15T00:00:00.000Z") } },
        ],
      },
      { nome: 1, turmaId: 1, responsaveis: 1 },
    );
  });

  it("sem aniversariantes hoje: não notifica ninguém nem grava nada", async () => {
    const resultado = await notificarAniversariantesService();

    expect(resultado).toEqual({
      aniversariantes: 0,
      responsaveisNotificados: 0,
      turmasNotificadas: 0,
    });
    expect(enviarNotificacao).not.toHaveBeenCalled();
    expect(CriancaRepository.model.updateMany).not.toHaveBeenCalled();
  });

  it("agrupa por responsável — 1 push por pessoa mesmo com mais de um filho aniversariante", async () => {
    (CriancaRepository.find as jest.Mock).mockResolvedValue([
      { _id: "c1", nome: "Sofia", turmaId: null, responsaveis: [{ usuarioId: "u1" }] },
      { _id: "c2", nome: "Davi", turmaId: null, responsaveis: [{ usuarioId: "u1" }] },
    ]);

    await notificarAniversariantesService();

    const chamadasResponsavel = (enviarNotificacao as jest.Mock).mock.calls.filter(
      ([ids]) => ids[0] === "u1",
    );
    expect(chamadasResponsavel).toHaveLength(1);
    expect(chamadasResponsavel[0][1].corpo).toBe(
      "Hoje é aniversário de 2 dos seus filhos: Sofia, Davi! 🎉",
    );
  });

  it("corpo singular quando só 1 filho aniversaria", async () => {
    (CriancaRepository.find as jest.Mock).mockResolvedValue([
      { _id: "c1", nome: "Sofia", turmaId: null, responsaveis: [{ usuarioId: "u1" }] },
    ]);

    await notificarAniversariantesService();

    const [, payload] = (enviarNotificacao as jest.Mock).mock.calls[0];
    expect(payload.corpo).toBe("Hoje é aniversário da Sofia! 🎉");
    expect(payload.dados).toEqual({ tipo: "aniversario", url: "/inicio" });
  });

  it("ignora responsável sem usuarioId vinculado", async () => {
    (CriancaRepository.find as jest.Mock).mockResolvedValue([
      { _id: "c1", nome: "Sofia", turmaId: null, responsaveis: [{ usuarioId: undefined }] },
    ]);

    const resultado = await notificarAniversariantesService();

    expect(resultado.responsaveisNotificados).toBe(0);
    expect(enviarNotificacao).not.toHaveBeenCalled();
  });

  it("notifica todos os professores da turma (múltiplos professores, OPS-03) com 1 push agregado", async () => {
    (CriancaRepository.find as jest.Mock).mockResolvedValue([
      { _id: "c1", nome: "Sofia", turmaId: "t1", responsaveis: [] },
      { _id: "c2", nome: "Davi", turmaId: "t1", responsaveis: [] },
    ]);
    (TurmaRepository.find as jest.Mock).mockResolvedValue([
      { _id: "t1", nome: "Azul", professorIds: ["p1", "p2"] },
    ]);
    (ProfessorRepository.find as jest.Mock).mockResolvedValue([
      { _id: "p1", usuarioId: "up1" },
      { _id: "p2", usuarioId: "up2" },
    ]);

    const resultado = await notificarAniversariantesService();

    expect(resultado.turmasNotificadas).toBe(1);
    const chamadaTurma = (enviarNotificacao as jest.Mock).mock.calls.find(([ids]) =>
      ids.includes("up1"),
    );
    expect(chamadaTurma![0]).toEqual(["up1", "up2"]);
    expect(chamadaTurma![1].corpo).toBe(
      "Hoje é aniversário de 2 alunos da Turma Azul!",
    );
  });

  it("criança sem turma não gera notificação de turma", async () => {
    (CriancaRepository.find as jest.Mock).mockResolvedValue([
      { _id: "c1", nome: "Sofia", turmaId: null, responsaveis: [] },
    ]);

    const resultado = await notificarAniversariantesService();

    expect(resultado.turmasNotificadas).toBe(0);
    expect(TurmaRepository.find).not.toHaveBeenCalled();
  });

  it("marca ultimoAniversarioNotificadoEm de todos os aniversariantes do dia", async () => {
    (CriancaRepository.find as jest.Mock).mockResolvedValue([
      { _id: "c1", nome: "Sofia", turmaId: null, responsaveis: [] },
      { _id: "c2", nome: "Davi", turmaId: null, responsaveis: [] },
    ]);

    await notificarAniversariantesService();

    expect(CriancaRepository.model.updateMany).toHaveBeenCalledWith(
      { _id: { $in: ["c1", "c2"] } },
      { $set: { ultimoAniversarioNotificadoEm: AGORA } },
    );
  });
});
