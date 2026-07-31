import { db } from "../../libs/mongo";
import { TurmaRepository } from "../../repositories/turma.repository";
import { CriancaRepository } from "../../repositories/crianca.repository";
import { AvisoRepository } from "../../repositories/aviso.repository";
import { PlanoAulaRepository } from "../../repositories/planoAula.repository";
import { httpError, STATUS_CODE } from "../../utils/errors";

export const removeTurmaService = async (turmaId: string): Promise<void> => {
  const turma = await TurmaRepository.findById(turmaId);
  if (!turma) {
    throw httpError(STATUS_CODE.NOT_FOUND, "NOT_FOUND", "Turma não encontrada.");
  }

  const criancaVinculada = await CriancaRepository.findOne({ turmaId });
  if (criancaVinculada) {
    throw httpError(
      STATUS_CODE.CONFLICT,
      "TURMA_COM_CRIANCAS_VINCULADAS",
      "Não é possível remover: há crianças vinculadas a esta turma. Realoque-as antes.",
    );
  }

  await db();

  await AvisoRepository.model.deleteMany({ turmaId });
  await PlanoAulaRepository.model.deleteMany({ turmaId });

  await TurmaRepository.deleteOne({ _id: turmaId });
};
