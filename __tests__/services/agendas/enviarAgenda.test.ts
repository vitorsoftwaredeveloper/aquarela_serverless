import { enviarAgendaService } from "../../../src/services/agendas/enviarAgenda";
import { AgendaRepository } from "../../../src/repositories/agenda.repository";
import { loadCriancaDaTurmaDoProfessor } from "../../../src/services/shared/agendaAccess";
import { enviarNotificacao } from "../../../src/services/notificacoes/enviarNotificacao";

jest.mock("../../../src/libs/mongo", () => ({ db: jest.fn() }));
jest.mock("../../../src/repositories/agenda.repository", () => ({
  AgendaRepository: { findById: jest.fn(), updateOne: jest.fn() },
}));
jest.mock("../../../src/services/shared/agendaAccess", () => ({
  loadCriancaDaTurmaDoProfessor: jest.fn(),
}));
jest.mock("../../../src/services/notificacoes/enviarNotificacao", () => ({
  enviarNotificacao: jest.fn(),
}));

const requester = { sub: "professor-1", papel: "professor" } as any;
const crianca = {
  _id: "crianca-1",
  nome: "Sofia",
  responsaveis: [{ usuarioId: "resp-1" }, { usuarioId: null }],
};

describe("enviarAgendaService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (loadCriancaDaTurmaDoProfessor as jest.Mock).mockResolvedValue(crianca);
  });

  it("lança 404 quando a agenda não existe", async () => {
    (AgendaRepository.findById as jest.Mock).mockResolvedValue(null);

    await expect(
      enviarAgendaService(requester, "agenda-1"),
    ).rejects.toMatchObject({ statusCode: 404, code: "NOT_FOUND" });
    expect(enviarNotificacao).not.toHaveBeenCalled();
  });

  it("1º envio: notifica 'já está disponível' e grava enviadaEm + ultimoEnvioEm", async () => {
    (AgendaRepository.findById as jest.Mock)
      .mockResolvedValueOnce({
        _id: "agenda-1",
        criancaId: "crianca-1",
        enviadaEm: null,
        ultimoEnvioEm: null,
      })
      .mockResolvedValueOnce({
        _id: "agenda-1",
        criancaId: "crianca-1",
        enviadaEm: new Date(),
        ultimoEnvioEm: new Date(),
        enviosCount: 1,
      });

    const resultado = await enviarAgendaService(requester, "agenda-1");

    expect(enviarNotificacao).toHaveBeenCalledWith(
      ["resp-1"],
      expect.objectContaining({
        corpo: "A agenda de hoje de Sofia já está disponível",
      }),
    );

    const [filtro, update] = (AgendaRepository.updateOne as jest.Mock).mock
      .calls[0];
    expect(filtro).toEqual({ _id: "agenda-1" });
    expect(update.$set.enviadaEm).toBeInstanceOf(Date);
    expect(update.$set.ultimoEnvioEm).toBeInstanceOf(Date);
    expect(update.$inc).toEqual({ enviosCount: 1 });

    expect(resultado.notificado).toBe(true);
    expect(resultado.motivo).toBeUndefined();
  });

  it("reenvio fora da janela: notifica 'foi atualizada' e não regrava enviadaEm", async () => {
    const onzeMinAtras = new Date(Date.now() - 11 * 60 * 1000);
    (AgendaRepository.findById as jest.Mock)
      .mockResolvedValueOnce({
        _id: "agenda-1",
        criancaId: "crianca-1",
        enviadaEm: onzeMinAtras,
        ultimoEnvioEm: onzeMinAtras,
        enviosCount: 1,
      })
      .mockResolvedValueOnce({
        _id: "agenda-1",
        criancaId: "crianca-1",
        enviadaEm: onzeMinAtras,
        ultimoEnvioEm: new Date(),
        enviosCount: 2,
      });

    const resultado = await enviarAgendaService(requester, "agenda-1");

    expect(enviarNotificacao).toHaveBeenCalledWith(
      ["resp-1"],
      expect.objectContaining({
        corpo: "A agenda de hoje de Sofia foi atualizada",
      }),
    );

    const [, update] = (AgendaRepository.updateOne as jest.Mock).mock
      .calls[0];
    expect(update.$set.enviadaEm).toBeUndefined();
    expect(update.$set.ultimoEnvioEm).toBeInstanceOf(Date);
    expect(update.$inc).toEqual({ enviosCount: 1 });

    expect(resultado.notificado).toBe(true);
  });

  it("reenvio dentro da janela de 10 min: não notifica nem grava, responde DEBOUNCE", async () => {
    const cincoMinAtras = new Date(Date.now() - 5 * 60 * 1000);
    (AgendaRepository.findById as jest.Mock).mockResolvedValue({
      _id: "agenda-1",
      criancaId: "crianca-1",
      enviadaEm: cincoMinAtras,
      ultimoEnvioEm: cincoMinAtras,
      enviosCount: 3,
    });

    const resultado = await enviarAgendaService(requester, "agenda-1");

    expect(enviarNotificacao).not.toHaveBeenCalled();
    expect(AgendaRepository.updateOne).not.toHaveBeenCalled();
    expect(resultado).toMatchObject({ notificado: false, motivo: "DEBOUNCE" });
  });
});
