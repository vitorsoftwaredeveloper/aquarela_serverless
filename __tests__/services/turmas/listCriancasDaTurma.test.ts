import { listCriancasDaTurmaService } from "../../../src/services/turmas/listCriancasDaTurma";
import { CriancaRepository } from "../../../src/repositories/crianca.repository";
import { AgendaRepository } from "../../../src/repositories/agenda.repository";
import { getTurmaByIdService } from "../../../src/services/turmas/getTurmaById";

jest.mock("../../../src/repositories/crianca.repository");
jest.mock("../../../src/repositories/agenda.repository");
jest.mock("../../../src/services/turmas/getTurmaById");

const requester = { _id: "admin-1", papel: "admin" } as any;

describe("listCriancasDaTurmaService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getTurmaByIdService as jest.Mock).mockResolvedValue({ _id: "turma-1" });
  });

  it("marca agendaRegistradaHoje=true só para crianças com agenda de hoje", async () => {
    (CriancaRepository.find as jest.Mock).mockResolvedValue([
      { _id: "crianca-1", nome: "Diego" },
      { _id: "crianca-2", nome: "Lorena" },
    ]);
    (AgendaRepository.find as jest.Mock).mockResolvedValue([
      { criancaId: "crianca-2" },
    ]);

    const result = await listCriancasDaTurmaService(requester, "turma-1");

    expect(result).toEqual([
      { _id: "crianca-1", nome: "Diego", agendaRegistradaHoje: false },
      { _id: "crianca-2", nome: "Lorena", agendaRegistradaHoje: true },
    ]);
  });

  it("não consulta agenda quando a turma não tem crianças ativas", async () => {
    (CriancaRepository.find as jest.Mock).mockResolvedValue([]);

    const result = await listCriancasDaTurmaService(requester, "turma-1");

    expect(result).toEqual([]);
    expect(AgendaRepository.find).not.toHaveBeenCalled();
  });
});
