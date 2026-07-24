import { PlanoAulaRepository } from "../../repositories/planoAula.repository";
import { IPlanoAula } from "../../types/planosAula";
import { IUsuario } from "../../types/usuarios";
import { httpError, STATUS_CODE } from "../../utils/errors";
import { getTurmaByIdService } from "../turmas/getTurmaById";

export const removePlanoAulaService = async (
  requester: IUsuario,
  planoAulaId: string,
): Promise<void> => {
  const plano = (await PlanoAulaRepository.findById(
    planoAulaId,
  )) as IPlanoAula | null;
  if (!plano) {
    throw httpError(
      STATUS_CODE.NOT_FOUND,
      "NOT_FOUND",
      "Plano de aula não encontrado.",
    );
  }

  // ownership da turma (professor só remove das suas)
  await getTurmaByIdService(requester, plano.turmaId);

  await PlanoAulaRepository.deleteOne({ _id: planoAulaId });
};
