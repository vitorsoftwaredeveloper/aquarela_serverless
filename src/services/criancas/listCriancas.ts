import { CriancaRepository } from "../../repositories/crianca.repository";
import { TurmaRepository } from "../../repositories/turma.repository";
import { ICrianca } from "../../types/criancas";
import { IUsuario } from "../../types/usuarios";
import { resolveProfessorId } from "../../utils/requester";
import { httpError, STATUS_CODE } from "../../utils/errors";

export interface IListCriancasFilters {
  turmaId?: string;
  nome?: string;
  ativo?: boolean;
}

export const listCriancasService = async (
  requester: IUsuario,
  filters: IListCriancasFilters,
): Promise<ICrianca[]> => {
  const query: Record<string, unknown> = { ativo: filters.ativo ?? true };

  if (requester.papel === "professor") {
    const professorId = await resolveProfessorId(requester);
    const turmasDoProfessor = await TurmaRepository.find(
      { professorId, ativo: true },
      { _id: 1 },
    );
    const turmaIds = turmasDoProfessor.map((turma: any) => String(turma._id));

    if (filters.turmaId && !turmaIds.includes(filters.turmaId)) {
      throw httpError(
        STATUS_CODE.FORBIDDEN,
        "FORBIDDEN",
        "Acesso permitido apenas às crianças das suas turmas.",
      );
    }

    query.turmaId = filters.turmaId ? filters.turmaId : { $in: turmaIds };
  } else if (filters.turmaId) {
    query.turmaId = filters.turmaId;
  }

  if (filters.nome) {
    query.nome = { $regex: filters.nome, $options: "i" };
  }

  return (await CriancaRepository.find(query, null, {
    sort: { nome: 1 },
  })) as ICrianca[];
};
