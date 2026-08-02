import { CriancaRepository } from "../../repositories/crianca.repository";
import { EventoRepository } from "../../repositories/evento.repository";
import { UsuarioRepository } from "../../repositories/usuario.repository";
import { IEvento } from "../../types/eventos";
import { IUsuario } from "../../types/usuarios";
import { httpError, STATUS_CODE } from "../../utils/errors";
import { assertPodeGerenciarEvento } from "../shared/eventoAccess";
import { enviarNotificacao } from "../notificacoes/enviarNotificacao";
import { IEventoComFotosUrl, withFotosUrl } from "./withFotosUrl";

const resolveDestinatarios = async (turmaId?: string): Promise<string[]> => {
  if (!turmaId) {
    const usuarios = await UsuarioRepository.find({}, { _id: 1 });
    return usuarios.map((usuario: any) => String(usuario._id));
  }

  const criancas = await CriancaRepository.find(
    { turmaId },
    { responsaveis: 1 },
  );
  const usuarioIds = criancas
    .flatMap((crianca: any) => crianca.responsaveis ?? [])
    .map((responsavel: any) => responsavel.usuarioId)
    .filter((usuarioId: unknown): usuarioId is string => Boolean(usuarioId))
    .map((usuarioId: unknown) => String(usuarioId));

  return [...new Set(usuarioIds)];
};

export const publicarEventoService = async (
  requester: IUsuario,
  eventoId: string,
): Promise<IEventoComFotosUrl & { notificado: boolean }> => {
  const evento = (await EventoRepository.findById(
    eventoId,
  )) as IEvento | null;
  if (!evento) {
    throw httpError(
      STATUS_CODE.NOT_FOUND,
      "NOT_FOUND",
      "Evento não encontrado.",
    );
  }

  await assertPodeGerenciarEvento(requester, evento);

  if (evento.publicadoEm) {
    return { ...(await withFotosUrl(evento)), notificado: false };
  }

  const agora = new Date();
  await EventoRepository.updateOne(
    { _id: eventoId },
    { $set: { publicado: true, publicadoEm: agora } },
  );

  try {
    const usuarioIds = await resolveDestinatarios(evento.turmaId);
    await enviarNotificacao(usuarioIds, {
      titulo: "Aquarela Kids",
      corpo: `Novas fotos do evento ${evento.titulo}`,
      dados: {
        eventoId: String(evento._id),
        url: `/mural/${evento._id}`,
      },
    });
  } catch (error) {
    console.error("falha ao notificar publicacao de evento", {
      eventoId: String(evento._id),
      error,
    });
  }

  const atualizado = (await EventoRepository.findById(
    eventoId,
  )) as IEvento;

  return { ...(await withFotosUrl(atualizado)), notificado: true };
};
