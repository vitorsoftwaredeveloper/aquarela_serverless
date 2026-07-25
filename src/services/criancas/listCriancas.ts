import { CriancaRepository } from "../../repositories/crianca.repository";
import { TurmaRepository } from "../../repositories/turma.repository";
import { ICrianca } from "../../types/criancas";
import { IUsuario } from "../../types/usuarios";
import { resolveProfessorId } from "../../utils/requester";
import { httpError, STATUS_CODE } from "../../utils/errors";
import { withFotoUrls } from "../shared/fotoCrianca";

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
  } else if (requester.papel === "responsavel") {
    query.$or = [
      { _id: { $in: requester.criancasVinculadas ?? [] } },
      { "responsaveis.usuarioId": String(requester._id) },
    ];
    if (filters.turmaId) query.turmaId = filters.turmaId;
  } else if (filters.turmaId) {
    query.turmaId = filters.turmaId;
  }

  if (filters.nome) {
    query.nome = { $regex: filters.nome, $options: "i" };
  }

  const criancas = (await CriancaRepository.find(query, null, {
    sort: { nome: 1 },
  })) as ICrianca[];

  return withFotoUrls(await withTurmaNomes(criancas));
};

const withTurmaNomes = async (criancas: ICrianca[]): Promise<ICrianca[]> => {
  const turmaIds = [
    ...new Set(criancas.map((crianca) => crianca.turmaId).filter(Boolean)),
  ] as string[];
  if (turmaIds.length === 0) return criancas;

  const turmas = await TurmaRepository.find(
    { _id: { $in: turmaIds } },
    { nome: 1 },
  );
  const nomesPorTurmaId = new Map(
    turmas.map((turma: any) => [String(turma._id), turma.nome as string]),
  );

  return criancas.map((crianca) => ({
    ...crianca,
    turmaNome: crianca.turmaId
      ? (nomesPorTurmaId.get(String(crianca.turmaId)) ?? null)
      : null,
  }));
};
