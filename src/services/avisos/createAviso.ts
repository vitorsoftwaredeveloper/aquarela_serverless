import { AvisoRepository } from "../../repositories/aviso.repository";
import { TurmaRepository } from "../../repositories/turma.repository";
import { CriancaRepository } from "../../repositories/crianca.repository";
import { UsuarioRepository } from "../../repositories/usuario.repository";
import { ICreateAvisoPayload, IAviso } from "../../types/avisos";
import { IUsuario } from "../../types/usuarios";
import { httpError, STATUS_CODE } from "../../utils/errors";
import { enviarNotificacao } from "../notificacoes/enviarNotificacao";

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

export const createAvisoService = async (
  requester: IUsuario,
  payload: ICreateAvisoPayload,
): Promise<IAviso> => {
  if (payload.turmaId) {
    const turma = await TurmaRepository.findById(payload.turmaId);
    if (!turma) {
      throw httpError(
        STATUS_CODE.NOT_FOUND,
        "TURMA_NOT_FOUND",
        "Turma não encontrada.",
      );
    }
  }

  const created = await AvisoRepository.insertOne({
    titulo: payload.titulo,
    corpo: payload.corpo,
    autorId: requester._id,
    turmaId: payload.turmaId,
  });

  const usuarioIds = await resolveDestinatarios(payload.turmaId);
  await enviarNotificacao(usuarioIds, {
    titulo: payload.titulo,
    corpo: payload.corpo,
    dados: { avisoId: String(created._id) },
  });

  return (await AvisoRepository.findById(created._id)) as IAviso;
};
