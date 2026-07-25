import { listCriancasService } from "../../../src/services/criancas/listCriancas";
import { CriancaRepository } from "../../../src/repositories/crianca.repository";
import { TurmaRepository } from "../../../src/repositories/turma.repository";

jest.mock("../../../src/repositories/crianca.repository");
jest.mock("../../../src/repositories/turma.repository");
jest.mock("../../../src/services/shared/fotoCrianca", () => ({
  withFotoUrls: jest.fn(async (criancas: any) => criancas),
}));

const admin = { _id: "admin-1", papel: "admin" } as any;

describe("listCriancasService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("resolve turmaNome a partir de turmaId, sem duplicar lookups", async () => {
    (CriancaRepository.find as jest.Mock).mockResolvedValue([
      { _id: "c1", nome: "Diego", turmaId: "turma-1" },
      { _id: "c2", nome: "Joao", turmaId: "turma-1" },
      { _id: "c3", nome: "Lorena", turmaId: null },
    ]);
    (TurmaRepository.find as jest.Mock).mockResolvedValue([
      { _id: "turma-1", nome: "Turma A" },
    ]);

    const result = await listCriancasService(admin, {});

    expect(TurmaRepository.find).toHaveBeenCalledWith(
      { _id: { $in: ["turma-1"] } },
      { nome: 1 },
    );
    expect(result).toEqual([
      { _id: "c1", nome: "Diego", turmaId: "turma-1", turmaNome: "Turma A" },
      { _id: "c2", nome: "Joao", turmaId: "turma-1", turmaNome: "Turma A" },
      { _id: "c3", nome: "Lorena", turmaId: null, turmaNome: null },
    ]);
  });

  it("não consulta turmas quando nenhuma criança tem turmaId", async () => {
    (CriancaRepository.find as jest.Mock).mockResolvedValue([
      { _id: "c1", nome: "Diego", turmaId: null },
    ]);

    await listCriancasService(admin, {});

    expect(TurmaRepository.find).not.toHaveBeenCalled();
  });
});
