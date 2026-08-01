import { CriancaRepository } from "../../repositories/crianca.repository";
import { TurmaRepository } from "../../repositories/turma.repository";
import { ICrianca } from "../../types/criancas";
import { IUsuario } from "../../types/usuarios";
import { resolveProfessorId } from "../../utils/requester";
import { httpError, STATUS_CODE } from "../../utils/errors";
import { isResponsavelDaCrianca } from "./criancaAccess";

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

export const loadCriancaParaMensagem = async (
  requester: IUsuario,
  criancaId: string,
): Promise<ICrianca> => {
  const crianca = (await CriancaRepository.findById(
    criancaId,
  )) as ICrianca | null;
  if (!crianca) {
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
