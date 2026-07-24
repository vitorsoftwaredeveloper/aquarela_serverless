import { PlanoAulaRepository } from "../../repositories/planoAula.repository";
import { IPlanoAula, IUpdatePlanoAulaPayload } from "../../types/planosAula";
import { IUsuario } from "../../types/usuarios";
import { httpError, STATUS_CODE } from "../../utils/errors";
import { getTurmaByIdService } from "../turmas/getTurmaById";

export const updatePlanoAulaService = async (
  requester: IUsuario,
  planoAulaId: string,
  payload: IUpdatePlanoAulaPayload,
): Promise<IPlanoAula> => {
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

  // ownership da turma atual (professor só mexe nas suas)
  await getTurmaByIdService(requester, plano.turmaId);

  const update: Record<string, unknown> = { ...payload };

  if (payload.turmaId && payload.turmaId !== String(plano.turmaId)) {
    const novaTurma = await getTurmaByIdService(requester, payload.turmaId);
    update.professorId = novaTurma.professorId;
  }

  await PlanoAulaRepository.updateOne({ _id: planoAulaId }, { $set: update });

  return (await PlanoAulaRepository.findById(planoAulaId)) as IPlanoAula;
};
