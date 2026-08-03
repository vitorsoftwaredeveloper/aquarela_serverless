import { getFrequenciaAgendaService } from "../../../src/services/agendas/getFrequenciaAgenda";
import { AgendaRepository } from "../../../src/repositories/agenda.repository";
import { loadCriancaParaLeituraAgenda } from "../../../src/services/shared/agendaAccess";

jest.mock("../../../src/libs/mongo", () => ({ db: jest.fn() }));
jest.mock("../../../src/repositories/agenda.repository", () => ({
  AgendaRepository: { model: { aggregate: jest.fn() } },
}));
jest.mock("../../../src/services/shared/agendaAccess", () => ({
  loadCriancaParaLeituraAgenda: jest.fn(),
}));

const requester = { sub: "resp-1", papel: "responsavel" } as any;
const criancaId = "507f1f77bcf86cd799439011";

describe("getFrequenciaAgendaService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (loadCriancaParaLeituraAgenda as jest.Mock).mockResolvedValue({
      _id: criancaId,
    });
  });

  it("confere acesso de leitura antes de agregar (professor da turma ou responsável do filho)", async () => {
    (AgendaRepository.model.aggregate as jest.Mock).mockResolvedValue([]);

    await getFrequenciaAgendaService(
      requester,
      criancaId,
      "2026-08-01",
      "2026-08-31",
    );

    expect(loadCriancaParaLeituraAgenda).toHaveBeenCalledWith(
      requester,
      criancaId,
    );
  });

  it("soma presente/falta/atrasado do período e devolve total", async () => {
    (AgendaRepository.model.aggregate as jest.Mock).mockResolvedValue([
      { _id: "presente", total: 18 },
      { _id: "falta", total: 2 },
      { _id: "atrasado", total: 3 },
    ]);

    const resultado = await getFrequenciaAgendaService(
      requester,
      criancaId,
      "2026-08-01",
      "2026-08-31",
    );

    expect(resultado).toEqual({
      criancaId,
      de: "2026-08-01",
      ate: "2026-08-31",
      presente: 18,
      falta: 2,
      atrasado: 3,
      total: 23,
    });
  });

  it("filtra por criancaId (ObjectId) e pela data no período, só dias com presença registrada", async () => {
    (AgendaRepository.model.aggregate as jest.Mock).mockResolvedValue([]);

    await getFrequenciaAgendaService(
      requester,
      criancaId,
      "2026-08-01",
      "2026-08-31",
    );

    const [pipeline] = (AgendaRepository.model.aggregate as jest.Mock).mock
      .calls[0];
    const match = pipeline[0].$match;
    expect(match.criancaId.toString()).toBe(criancaId);
    expect(match.data.$gte).toEqual(new Date("2026-08-01"));
    expect(match.data.$lte).toEqual(new Date("2026-08-31"));
    expect(match["presenca.status"]).toEqual({ $exists: true });
  });

  it("devolve zeros quando não há nenhum dia com presença no período", async () => {
    (AgendaRepository.model.aggregate as jest.Mock).mockResolvedValue([]);

    const resultado = await getFrequenciaAgendaService(
      requester,
      criancaId,
      "2026-08-01",
      "2026-08-31",
    );

    expect(resultado).toMatchObject({ presente: 0, falta: 0, atrasado: 0, total: 0 });
  });

  it("rejeita de/ate inválidos com 400, sem chegar a agregar", async () => {
    await expect(
      getFrequenciaAgendaService(requester, criancaId, "não-é-data", "2026-08-31"),
    ).rejects.toMatchObject({ statusCode: 400, code: "BAD_REQUEST" });
    expect(AgendaRepository.model.aggregate).not.toHaveBeenCalled();
  });
});
