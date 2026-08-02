import { listTurmasService } from "../../../src/services/turmas/listTurmas";
import { TurmaRepository } from "../../../src/repositories/turma.repository";
import { ProfessorRepository } from "../../../src/repositories/professor.repository";
import { CriancaRepository } from "../../../src/repositories/crianca.repository";
import { AgendaRepository } from "../../../src/repositories/agenda.repository";
import { resolveProfessorId } from "../../../src/utils/requester";

jest.mock("../../../src/repositories/turma.repository");
jest.mock("../../../src/repositories/professor.repository");
jest.mock("../../../src/repositories/crianca.repository");
jest.mock("../../../src/repositories/agenda.repository");
jest.mock("../../../src/utils/requester");

const admin = { _id: "admin-1", papel: "admin" } as any;

describe("listTurmasService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("inclui o professor vinculado a cada turma para o admin", async () => {
    (TurmaRepository.find as jest.Mock).mockResolvedValue([
      { _id: "turma-1", nome: "Flor", professorId: "prof-1" },
      { _id: "turma-2", nome: "Girassóis", professorId: "prof-2" },
    ]);
    (ProfessorRepository.find as jest.Mock).mockResolvedValue([
      { _id: "prof-1", nome: "Ana", email: "ana@example.com" },
      { _id: "prof-2", nome: "Bruno", email: "bruno@example.com" },
    ]);
    (CriancaRepository.find as jest.Mock).mockResolvedValue([
      { turmaId: "turma-1" },
      { turmaId: "turma-1" },
      { turmaId: "turma-2" },
    ]);

    const result = await listTurmasService(admin);

    expect(result).toEqual([
      {
        _id: "turma-1",
        nome: "Flor",
        professorId: "prof-1",
        professor: { _id: "prof-1", nome: "Ana", email: "ana@example.com" },
        totalCriancas: 2,
      },
      {
        _id: "turma-2",
        nome: "Girassóis",
        professorId: "prof-2",
        professor: { _id: "prof-2", nome: "Bruno", email: "bruno@example.com" },
        totalCriancas: 1,
      },
    ]);
    expect(ProfessorRepository.find).toHaveBeenCalledWith(
      { _id: { $in: ["prof-1", "prof-2"] } },
      { nome: 1, email: 1 },
    );
  });

  it("devolve professor: null quando o professor vinculado não existe mais", async () => {
    (TurmaRepository.find as jest.Mock).mockResolvedValue([
      { _id: "turma-1", nome: "Flor", professorId: "prof-orfao" },
    ]);
    (ProfessorRepository.find as jest.Mock).mockResolvedValue([]);
    (CriancaRepository.find as jest.Mock).mockResolvedValue([]);

    const result = await listTurmasService(admin);

    expect(result).toEqual([
      {
        _id: "turma-1",
        nome: "Flor",
        professorId: "prof-orfao",
        professor: null,
        totalCriancas: 0,
      },
    ]);
  });

  it("não consulta professores quando não há turmas", async () => {
    (TurmaRepository.find as jest.Mock).mockResolvedValue([]);

    const result = await listTurmasService(admin);

    expect(result).toEqual([]);
    expect(ProfessorRepository.find).not.toHaveBeenCalled();
  });

  it("mantém o join de professor junto com as estatísticas do professor", async () => {
    const professor = { _id: "prof-1", papel: "professor" } as any;
    (resolveProfessorId as jest.Mock).mockResolvedValue("prof-1");
    (TurmaRepository.find as jest.Mock).mockResolvedValue([
      { _id: "turma-1", nome: "Flor", professorId: "prof-1" },
    ]);
    (ProfessorRepository.find as jest.Mock).mockResolvedValue([
      { _id: "prof-1", nome: "Ana", email: "ana@example.com" },
    ]);
    (CriancaRepository.find as jest.Mock).mockResolvedValue([
      { turmaId: "turma-1" },
    ]);
    (AgendaRepository.find as jest.Mock).mockResolvedValue([]);

    const result = await listTurmasService(professor);

    expect(result).toEqual([
      {
        _id: "turma-1",
        nome: "Flor",
        professorId: "prof-1",
        professor: { _id: "prof-1", nome: "Ana", email: "ana@example.com" },
        totalCriancas: 1,
        agendasPendentes: 1,
      },
    ]);
  });
});
