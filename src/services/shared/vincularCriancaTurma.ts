import { CriancaRepository } from "../../repositories/crianca.repository";
import { TurmaRepository } from "../../repositories/turma.repository";
import { ICrianca } from "../../types/criancas";
import { httpError, STATUS_CODE } from "../../utils/errors";

/**
 * Vincula (ou move) uma criança para uma turma. Uma criança pertence a uma
 * turma por vez — vincular a uma nova substitui o vínculo anterior. Usado
 * tanto por `POST /turmas/{id}/criancas` quanto por `PATCH
 * /criancas/{id}/turma` (mesma regra de negócio, duas rotas).
 */
export const vincularCriancaTurma = async (
  criancaId: string,
  turmaId: string,
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

  const turma = await TurmaRepository.findById(turmaId);
  if (!turma || !(turma as any).ativo) {
    throw httpError(STATUS_CODE.NOT_FOUND, "NOT_FOUND", "Turma não encontrada.");
  }

  await CriancaRepository.updateOne(
    { _id: criancaId },
    { $set: { turmaId } },
  );

  return (await CriancaRepository.findById(criancaId)) as ICrianca;
};

/**
 * Desvincula a criança da turma atual (`turmaId` volta a `null`). Exige que
 * a criança esteja de fato vinculada à turma informada na rota.
 */
export const desvincularCriancaTurma = async (
  turmaId: string,
  criancaId: string,
): Promise<void> => {
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

  if (String(crianca.turmaId ?? "") !== String(turmaId)) {
    throw httpError(
      STATUS_CODE.CONFLICT,
      "CRIANCA_NAO_VINCULADA",
      "Esta criança não está vinculada a esta turma.",
    );
  }

  await CriancaRepository.updateOne(
    { _id: criancaId },
    { $set: { turmaId: null } },
  );
};
