import { PlanoAulaRepository } from "../../repositories/planoAula.repository";
import { ICreatePlanoAulaPayload, IPlanoAula } from "../../types/planosAula";
import { IUsuario } from "../../types/usuarios";
import { resolveProfessorId } from "../../utils/requester";
import { getTurmaByIdService } from "../turmas/getTurmaById";

export const createPlanoAulaService = async (
  requester: IUsuario,
  payload: ICreatePlanoAulaPayload,
): Promise<IPlanoAula> => {
  const turma = await getTurmaByIdService(requester, payload.turmaId);

  const professorId =
    requester.papel === "professor"
      ? await resolveProfessorId(requester)
      : turma.professorIds[0];

  const created = await PlanoAulaRepository.insertOne({
    turmaId: payload.turmaId,
    professorId,
    titulo: payload.titulo,
    descricao: payload.descricao,
    data: payload.data,
    objetivos: payload.objetivos,
    materiais: payload.materiais,
  });

  return (await PlanoAulaRepository.findById(created._id)) as IPlanoAula;
};
