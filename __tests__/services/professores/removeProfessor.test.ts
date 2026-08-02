import { removeProfessorService } from "../../../src/services/professores/removeProfessor";
import { ProfessorRepository } from "../../../src/repositories/professor.repository";
import { TurmaRepository } from "../../../src/repositories/turma.repository";
import { UsuarioRepository } from "../../../src/repositories/usuario.repository";
import { removeCognitoUser } from "../../../src/libs/cognito";
import { removerFotoDoBucket } from "../../../src/services/shared/fotoProfessor";

jest.mock("../../../src/libs/mongo", () => ({ db: jest.fn() }));
jest.mock("../../../src/repositories/professor.repository", () => ({
  ProfessorRepository: { findById: jest.fn(), deleteOne: jest.fn() },
}));
jest.mock("../../../src/repositories/turma.repository", () => ({
  TurmaRepository: {
    find: jest.fn(),
    model: { updateMany: jest.fn() },
  },
}));
jest.mock("../../../src/repositories/usuario.repository", () => ({
  UsuarioRepository: { findById: jest.fn(), deleteOne: jest.fn() },
}));
jest.mock("../../../src/libs/cognito", () => ({
  removeCognitoUser: jest.fn(),
}));
jest.mock("../../../src/services/shared/fotoProfessor", () => ({
  removerFotoDoBucket: jest.fn(),
}));

describe("removeProfessorService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (ProfessorRepository.findById as jest.Mock).mockResolvedValue({
      _id: "prof-1",
      usuarioId: "usuario-1",
      foto: null,
    });
    (UsuarioRepository.findById as jest.Mock).mockResolvedValue(null);
  });

  it("bloqueia quando o professor é o único de alguma turma", async () => {
    (TurmaRepository.find as jest.Mock).mockResolvedValue([
      { _id: "turma-1", professorIds: ["prof-1"] },
    ]);

    await expect(removeProfessorService("prof-1")).rejects.toMatchObject({
      code: "PROFESSOR_COM_TURMA_VINCULADA",
    });

    expect(ProfessorRepository.deleteOne).not.toHaveBeenCalled();
  });

  it("remove do array e permite exclusão quando há outro professor na turma", async () => {
    (TurmaRepository.find as jest.Mock).mockResolvedValue([
      { _id: "turma-1", professorIds: ["prof-1", "prof-2"] },
    ]);

    await removeProfessorService("prof-1");

    expect(TurmaRepository.model.updateMany).toHaveBeenCalledWith(
      { professorIds: "prof-1" },
      { $pull: { professorIds: "prof-1" } },
    );
    expect(ProfessorRepository.deleteOne).toHaveBeenCalledWith({
      _id: "prof-1",
    });
  });

  it("não toca em turmas quando o professor não leciona nenhuma", async () => {
    (TurmaRepository.find as jest.Mock).mockResolvedValue([]);

    await removeProfessorService("prof-1");

    expect(TurmaRepository.model.updateMany).not.toHaveBeenCalled();
    expect(ProfessorRepository.deleteOne).toHaveBeenCalledWith({
      _id: "prof-1",
    });
  });

  it("remove usuário Cognito vinculado quando existir", async () => {
    (TurmaRepository.find as jest.Mock).mockResolvedValue([]);
    (UsuarioRepository.findById as jest.Mock).mockResolvedValue({
      _id: "usuario-1",
      email: "prof@example.com",
    });

    await removeProfessorService("prof-1");

    expect(removeCognitoUser).toHaveBeenCalledWith("prof@example.com");
    expect(UsuarioRepository.deleteOne).toHaveBeenCalledWith({
      _id: "usuario-1",
    });
    expect(removerFotoDoBucket).toHaveBeenCalledWith(null);
  });
});
