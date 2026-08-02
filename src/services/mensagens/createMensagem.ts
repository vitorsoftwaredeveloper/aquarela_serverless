import { MensagemRepository } from "../../repositories/mensagem.repository";
import { ProfessorRepository } from "../../repositories/professor.repository";
import { TurmaRepository } from "../../repositories/turma.repository";
import { ICreateMensagemPayload, IMensagem } from "../../types/mensagens";
import { IUsuario } from "../../types/usuarios";
import { loadCriancaParaMensagem } from "../shared/mensagemAccess";
import { validarAnexosVinculados } from "../anexos/validarAnexoVinculado";
import { enviarNotificacao } from "../notificacoes/enviarNotificacao";
import { withAnexosUrl, IMensagemComAnexosUrl } from "./withAnexosUrl";

const resolveDestinatarios = async (
  autor: IUsuario,
  crianca: { turmaId?: string | null; responsaveis: { usuarioId?: string }[] },
): Promise<string[]> => {
  if (autor.papel === "responsavel") {
    if (!crianca.turmaId) return [];
    const turma = await TurmaRepository.findById(crianca.turmaId);
    if (!turma) return [];
    const professores = await ProfessorRepository.find({
      _id: { $in: (turma as any).professorIds },
    });
    return professores
      .map((professor: any) => professor.usuarioId)
      .filter((usuarioId: unknown): usuarioId is string => Boolean(usuarioId))
      .map((usuarioId: string) => String(usuarioId));
  }

  return [
    ...new Set(
      crianca.responsaveis
        .map((responsavel) => responsavel.usuarioId)
        .filter((usuarioId): usuarioId is string => Boolean(usuarioId))
        .map((usuarioId) => String(usuarioId)),
    ),
  ];
};

export const createMensagemService = async (
  requester: IUsuario,
  payload: ICreateMensagemPayload,
): Promise<IMensagemComAnexosUrl> => {
  const crianca = await loadCriancaParaMensagem(requester, payload.criancaId);

  if (payload.anexos && payload.anexos.length > 0) {
    await validarAnexosVinculados("mensagem", payload.anexos);
  }

  const created = await MensagemRepository.insertOne({
    criancaId: crianca._id,
    turmaId: crianca.turmaId ?? undefined,
    autorId: requester._id,
    autorNome: requester.nome,
    autorPapel: requester.papel as "professor" | "responsavel",
    corpo: payload.corpo,
    anexos: payload.anexos ?? [],
  });

  try {
    const destinatarios = await resolveDestinatarios(requester, crianca);
    const url =
      requester.papel === "responsavel"
        ? `/professor/recados/${crianca._id}`
        : `/recados/${crianca._id}`;
    await enviarNotificacao(destinatarios, {
      titulo: "Novo recado",
      corpo: `Novo recado sobre ${crianca.nome}`,
      dados: {
        mensagemId: String(created._id),
        criancaId: String(crianca._id),
        url,
      },
    });
  } catch (error) {
    console.error("falha ao notificar novo recado", {
      mensagemId: String(created._id),
      error,
    });
  }

  const mensagem = (await MensagemRepository.findById(
    created._id,
  )) as IMensagem;

  return withAnexosUrl(mensagem);
};
