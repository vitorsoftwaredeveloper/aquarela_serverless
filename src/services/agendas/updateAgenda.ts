import { AgendaRepository } from "../../repositories/agenda.repository";
import { IUpdateAgendaPayload, IAgendaDiaria } from "../../types/agendas";
import { IUsuario } from "../../types/usuarios";
import { loadCriancaDaTurmaDoProfessor } from "../shared/agendaAccess";
import { enviarNotificacao } from "../notificacoes/enviarNotificacao";
import { httpError, STATUS_CODE } from "../../utils/errors";

/**
 * Reenvia notificação só se a agenda já tinha sido publicada antes
 * (`enviadaEm` setado) — edição de rascunho não publicado não notifica.
 * Falha no FCM não derruba a edição: é best-effort, erro só vai pro log.
 */
export const updateAgendaService = async (
  requester: IUsuario,
  agendaId: string,
  payload: IUpdateAgendaPayload,
): Promise<IAgendaDiaria> => {
  const agenda = (await AgendaRepository.findById(
    agendaId,
  )) as IAgendaDiaria | null;
  if (!agenda) {
    throw httpError(
      STATUS_CODE.NOT_FOUND,
      "NOT_FOUND",
      "Registro de agenda não encontrado.",
    );
  }

  const crianca = await loadCriancaDaTurmaDoProfessor(
    requester,
    agenda.criancaId,
  );

  const update: Record<string, unknown> = {
    alimentacao: payload.alimentacao ?? [],
    sono: payload.sono ?? [],
    atividades: payload.atividades ?? [],
    humor: payload.humor ?? null,
    higiene: payload.higiene ?? null,
    medicacoesAdministradas: payload.medicacoesAdministradas ?? [],
    intercorrencias: (payload.intercorrencias ?? []).map((item) => ({
      ...item,
      notificado: item.notificado ?? false,
    })),
    observacoes: payload.observacoes ?? null,
  };

  const jaFoiEnviada = Boolean(agenda.enviadaEm);
  if (jaFoiEnviada) {
    update.enviadaEm = new Date();
  }

  await AgendaRepository.updateOne({ _id: agendaId }, { $set: update });

  if (jaFoiEnviada) {
    const usuarioIds = crianca.responsaveis
      .map((responsavel) => responsavel.usuarioId)
      .filter((usuarioId): usuarioId is string => Boolean(usuarioId));

    try {
      await enviarNotificacao(usuarioIds, {
        titulo: "Aquarela Kids",
        corpo: `A agenda de hoje da ${crianca.nome} foi atualizada`,
        dados: {
          criancaId: String(agenda.criancaId),
          agendaId: String(agenda._id),
        },
      });
    } catch (erro) {
      console.log("notificacao de atualizacao falhou", {
        agendaId,
        erro: erro instanceof Error ? erro.message : erro,
      });
    }
  }

  return (await AgendaRepository.findById(agendaId)) as IAgendaDiaria;
};
