import { CriancaRepository } from "../../repositories/crianca.repository";
import { TurmaRepository } from "../../repositories/turma.repository";
import { ICrianca } from "../../types/criancas";
import { IUsuario } from "../../types/usuarios";
import { resolveProfessorId } from "../../utils/requester";
import { httpError, STATUS_CODE } from "../../utils/errors";

const isResponsavelDaCrianca = (crianca: ICrianca, usuario: IUsuario): boolean =>
  crianca.responsaveis.some(
    (responsavel) => String(responsavel.usuarioId ?? "") === String(usuario._id),
  ) ||
  (usuario.criancasVinculadas ?? []).some(
    (id) => String(id) === String(crianca._id),
  );

const assertProfessorDaTurmaDaCrianca = async (
  requester: IUsuario,
  crianca: ICrianca,
): Promise<void> => {
  if (!crianca.turmaId) {
    throw httpError(
      STATUS_CODE.CONFLICT,
      "CRIANCA_SEM_TURMA",
      "Criança não está vinculada a uma turma.",
    );
  }

  const turma = await TurmaRepository.findById(crianca.turmaId);
  const professorId = await resolveProfessorId(requester);
  if (!turma || String((turma as any).professorId) !== professorId) {
    throw httpError(
      STATUS_CODE.FORBIDDEN,
      "FORBIDDEN",
      "Acesso permitido apenas às suas turmas.",
    );
  }
};

/**
 * Carrega a criança e confirma que o professor logado leciona a turma dela.
 * Usado por criar/editar registro de agenda — só a professora da turma
 * pode escrever.
 */
export const loadCriancaDaTurmaDoProfessor = async (
  requester: IUsuario,
  criancaId: string,
): Promise<ICrianca> => {
  const crianca = (await CriancaRepository.findById(
    criancaId,
  )) as ICrianca | null;
  if (!crianca || !crianca.ativo) {
    throw httpError(
      STATUS_CODE.NOT_FOUND,
      "NOT_FOUND",
      "Criança não encontrada.",
    );
  }

  await assertProfessorDaTurmaDaCrianca(requester, crianca);

  return crianca;
};

/**
 * Carrega a criança e confirma acesso de leitura à agenda: professor da
 * turma dela ou responsável pelo próprio filho.
 */
export const loadCriancaParaLeituraAgenda = async (
  requester: IUsuario,
  criancaId: string,
): Promise<ICrianca> => {
  const crianca = (await CriancaRepository.findById(
    criancaId,
  )) as ICrianca | null;
  if (!crianca || !crianca.ativo) {
    throw httpError(
      STATUS_CODE.NOT_FOUND,
      "NOT_FOUND",
      "Criança não encontrada.",
    );
  }

  if (requester.papel === "professor") {
    await assertProfessorDaTurmaDaCrianca(requester, crianca);
  } else if (
    requester.papel === "responsavel" &&
    !isResponsavelDaCrianca(crianca, requester)
  ) {
    throw httpError(
      STATUS_CODE.FORBIDDEN,
      "FORBIDDEN",
      "Acesso permitido apenas ao próprio filho.",
    );
  }

  return crianca;
};
