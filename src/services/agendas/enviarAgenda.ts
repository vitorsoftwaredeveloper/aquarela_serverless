import { AgendaRepository } from "../../repositories/agenda.repository";
import { IAgendaDiaria } from "../../types/agendas";
import { IUsuario } from "../../types/usuarios";
import { loadCriancaDaTurmaDoProfessor } from "../shared/agendaAccess";
import { enviarNotificacao } from "../notificacoes/enviarNotificacao";
import { httpError, STATUS_CODE } from "../../utils/errors";

const DEBOUNCE_MS = 10 * 60 * 1000;

export const enviarAgendaService = async (
  requester: IUsuario,
  agendaId: string,
): Promise<IAgendaDiaria & { notificado: boolean; motivo?: "DEBOUNCE" }> => {
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

  const agora = new Date();
  const ultimoEnvio = agenda.ultimoEnvioEm ?? agenda.enviadaEm;
  if (ultimoEnvio && agora.getTime() - new Date(ultimoEnvio).getTime() < DEBOUNCE_MS) {
    return { ...agenda, notificado: false, motivo: "DEBOUNCE" };
  }

  const primeiraVez = !agenda.enviadaEm;

  const usuarioIds = crianca.responsaveis
    .map((responsavel) => responsavel.usuarioId)
    .filter((usuarioId): usuarioId is string => Boolean(usuarioId));

  await enviarNotificacao(usuarioIds, {
    titulo: "Aquarela Kids",
    corpo: primeiraVez
      ? `A agenda de hoje de ${crianca.nome} já está disponível`
      : `A agenda de hoje de ${crianca.nome} foi atualizada`,
    dados: {
      criancaId: String(agenda.criancaId),
      agendaId: String(agenda._id),
      url: `/agenda/${agenda.criancaId}`,
    },
  });

  await AgendaRepository.updateOne(
    { _id: agendaId },
    {
      $set: {
        ultimoEnvioEm: agora,
        ...(primeiraVez ? { enviadaEm: agora } : {}),
      },
      $inc: { enviosCount: 1 },
    },
  );

  const atualizada = (await AgendaRepository.findById(
    agendaId,
  )) as IAgendaDiaria;

  return { ...atualizada, notificado: true };
};
