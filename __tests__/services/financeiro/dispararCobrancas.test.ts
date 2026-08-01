import { dispararCobrancasService } from "../../../src/services/financeiro/dispararCobrancas";
import { MensalidadeRepository } from "../../../src/repositories/mensalidade.repository";
import { CriancaRepository } from "../../../src/repositories/crianca.repository";
import { DispositivoRepository } from "../../../src/repositories/dispositivo.repository";
import { enviarNotificacao } from "../../../src/services/notificacoes/enviarNotificacao";

jest.mock("../../../src/libs/mongo", () => ({ db: jest.fn() }));
jest.mock("../../../src/repositories/mensalidade.repository", () => ({
  MensalidadeRepository: {
    find: jest.fn(),
    model: { bulkWrite: jest.fn() },
  },
}));
jest.mock("../../../src/repositories/crianca.repository", () => ({
  CriancaRepository: { find: jest.fn() },
}));
jest.mock("../../../src/repositories/dispositivo.repository", () => ({
  DispositivoRepository: { find: jest.fn() },
}));
jest.mock("../../../src/services/notificacoes/enviarNotificacao", () => ({
  enviarNotificacao: jest.fn().mockResolvedValue(undefined),
}));

const AGORA = new Date("2026-08-15T12:00:00.000Z"); // 15/08 09:00 GMT-3

describe("dispararCobrancasService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(AGORA);
    (MensalidadeRepository.find as jest.Mock).mockResolvedValue([]);
    (CriancaRepository.find as jest.Mock).mockResolvedValue([]);
    (DispositivoRepository.find as jest.Mock).mockResolvedValue([]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("seleciona só mensalidades com vencimento até o fim do mês corrente (GMT-3)", async () => {
    await dispararCobrancasService("dia05", false);

    expect(MensalidadeRepository.find).toHaveBeenCalledWith({
      status: { $in: ["aberto", "atrasado"] },
      vencimento: { $lt: new Date("2026-09-01T03:00:00.000Z") },
    });
  });

  it("idempotência: mesmo gatilho já disparado hoje não redispara", async () => {
    (MensalidadeRepository.find as jest.Mock).mockResolvedValue([
      {
        _id: "m1",
        criancaId: "c1",
        mes: 8,
        ano: 2026,
        cobrancas: [
          { enviadaEm: new Date("2026-08-15T13:00:00.000Z"), canal: "push", gatilho: "dia05" },
        ],
      },
    ]);

    const resultado = await dispararCobrancasService("dia05", false);

    expect(resultado).toEqual({
      dryRun: false,
      responsaveisNotificados: 0,
      responsaveisSemToken: 0,
      mensalidadesAtualizadas: 0,
    });
    expect(CriancaRepository.find).not.toHaveBeenCalled();
    expect(enviarNotificacao).not.toHaveBeenCalled();
    expect(MensalidadeRepository.model.bulkWrite).not.toHaveBeenCalled();
  });

  it("agrupa por responsável — 1 chamada de enviarNotificacao por pessoa, não por mensalidade", async () => {
    (MensalidadeRepository.find as jest.Mock).mockResolvedValue([
      { _id: "m1", criancaId: "c1", mes: 8, ano: 2026, cobrancas: [] },
      { _id: "m2", criancaId: "c2", mes: 8, ano: 2026, cobrancas: [] },
    ]);
    (CriancaRepository.find as jest.Mock).mockResolvedValue([
      { _id: "c1", nome: "Sofia", responsaveis: [{ usuarioId: "u1" }] },
      { _id: "c2", nome: "Davi", responsaveis: [{ usuarioId: "u1" }] },
    ]);
    (DispositivoRepository.find as jest.Mock).mockResolvedValue([
      { usuarioId: "u1", token: "tok1" },
    ]);

    await dispararCobrancasService("dia05", false);

    expect(enviarNotificacao).toHaveBeenCalledTimes(1);
    const [usuarioIds, payload] = (enviarNotificacao as jest.Mock).mock.calls[0];
    expect(usuarioIds).toEqual(["u1"]);
    expect(payload.corpo).toBe("Você tem 2 mensalidades em aberto.");
    expect(payload.dados).toEqual({ tipo: "cobranca", url: "/financeiro" });
  });

  it("corpo cita criança e competência quando é só 1 mensalidade — nunca o valor", async () => {
    (MensalidadeRepository.find as jest.Mock).mockResolvedValue([
      { _id: "m1", criancaId: "c1", mes: 9, ano: 2026, cobrancas: [] },
    ]);
    (CriancaRepository.find as jest.Mock).mockResolvedValue([
      { _id: "c1", nome: "Sofia", responsaveis: [{ usuarioId: "u1" }] },
    ]);
    (DispositivoRepository.find as jest.Mock).mockResolvedValue([
      { usuarioId: "u1", token: "tok1" },
    ]);

    await dispararCobrancasService("dia05", false);

    const [, payload] = (enviarNotificacao as jest.Mock).mock.calls[0];
    expect(payload.corpo).toBe("A mensalidade de Sofia (9/2026) está em aberto.");
    expect(payload.corpo).not.toMatch(/R\$/);
  });

  it("dryRun não envia nem grava, mas conta quem tem e quem não tem token válido", async () => {
    (MensalidadeRepository.find as jest.Mock).mockResolvedValue([
      { _id: "m1", criancaId: "c1", mes: 8, ano: 2026, cobrancas: [] },
      { _id: "m2", criancaId: "c2", mes: 8, ano: 2026, cobrancas: [] },
    ]);
    (CriancaRepository.find as jest.Mock).mockResolvedValue([
      { _id: "c1", nome: "Sofia", responsaveis: [{ usuarioId: "u1" }] },
      { _id: "c2", nome: "Davi", responsaveis: [{ usuarioId: "u2" }] },
    ]);
    (DispositivoRepository.find as jest.Mock).mockResolvedValue([
      { usuarioId: "u1", token: "tok1" },
    ]);

    const resultado = await dispararCobrancasService("manual", true);

    expect(resultado).toEqual({
      dryRun: true,
      responsaveisNotificados: 1,
      responsaveisSemToken: 1,
      mensalidadesAtualizadas: 0,
    });
    expect(enviarNotificacao).not.toHaveBeenCalled();
    expect(MensalidadeRepository.model.bulkWrite).not.toHaveBeenCalled();
  });

  it("gatilho manual grava cobrancas[] do mesmo jeito que o cron", async () => {
    (MensalidadeRepository.find as jest.Mock).mockResolvedValue([
      { _id: "m1", criancaId: "c1", mes: 8, ano: 2026, cobrancas: [] },
    ]);
    (CriancaRepository.find as jest.Mock).mockResolvedValue([
      { _id: "c1", nome: "Sofia", responsaveis: [{ usuarioId: "u1" }] },
    ]);
    (DispositivoRepository.find as jest.Mock).mockResolvedValue([
      { usuarioId: "u1", token: "tok1" },
    ]);

    const resultado = await dispararCobrancasService("manual", false);

    expect(resultado.mensalidadesAtualizadas).toBe(1);
    const [operacoes] = (MensalidadeRepository.model.bulkWrite as jest.Mock).mock
      .calls[0];
    expect(operacoes).toEqual([
      {
        updateOne: {
          filter: { _id: "m1" },
          update: {
            $push: {
              cobrancas: {
                $each: [{ enviadaEm: AGORA, canal: "push", gatilho: "manual" }],
                $slice: -12,
              },
            },
          },
        },
      },
    ]);
  });
});
