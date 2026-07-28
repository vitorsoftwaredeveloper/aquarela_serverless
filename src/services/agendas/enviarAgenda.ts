import { AgendaRepository } from "../../repositories/agenda.repository";
import { IAgendaDiaria } from "../../types/agendas";
import { IUsuario } from "../../types/usuarios";
import { loadCriancaDaTurmaDoProfessor } from "../shared/agendaAccess";
import { enviarNotificacao } from "../notificacoes/enviarNotificacao";
import { httpError, STATUS_CODE } from "../../utils/errors";

/**
 * Gatilho explícito ("Enviar para os pais"), não `save`: a agenda é
 * preenchida ao longo do dia e disparar a cada gravação geraria uma
 * notificação por refeição/sono/atividade. `enviadaEm` só é gravado depois
 * que `enviarNotificacao` resolve sem lançar — se o FCM falhar, o professor
 * pode tentar de novo em vez de ficar travado num envio que não aconteceu.
 */
export const enviarAgendaService = async (
  requester: IUsuario,
  agendaId: string,
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

  if (agenda.enviadaEm) {
    throw httpError(
      STATUS_CODE.CONFLICT,
      "AGENDA_JA_ENVIADA",
      "Agenda já foi enviada aos responsáveis.",
    );
  }

  const crianca = await loadCriancaDaTurmaDoProfessor(
    requester,
    agenda.criancaId,
  );

  const usuarioIds = crianca.responsaveis
    .map((responsavel) => responsavel.usuarioId)
    .filter((usuarioId): usuarioId is string => Boolean(usuarioId));

  // Corpo genérico por design (LGPD): nunca leva saúde/alimentação/medicação
  // — a notificação aparece na tela de bloqueio do responsável.
  await enviarNotificacao(usuarioIds, {
    titulo: "Aquarela Kids",
    corpo: `A agenda de hoje da ${crianca.nome} já está disponível`,
    dados: { criancaId: agenda.criancaId, agendaId: String(agenda._id) },
  });

  await AgendaRepository.updateOne(
    { _id: agendaId },
    { $set: { enviadaEm: new Date() } },
  );

  return (await AgendaRepository.findById(agendaId)) as IAgendaDiaria;
};
