import { EventoRepository } from "../../repositories/evento.repository";
import { TurmaRepository } from "../../repositories/turma.repository";
import { CriancaRepository } from "../../repositories/crianca.repository";
import { IEvento, IListEventosFilters } from "../../types/eventos";
import { IUsuario } from "../../types/usuarios";
import { resolveProfessorId } from "../../utils/requester";
import { IEventoComFotosUrl, withFotosUrls } from "./withFotosUrl";

const resolveTurmaIdsVisiveis = async (
  requester: IUsuario,
): Promise<string[]> => {
  if (requester.papel === "professor") {
    const professorId = await resolveProfessorId(requester);
    const turmas = await TurmaRepository.find(
      { professorIds: professorId },
      { _id: 1 },
    );
    return turmas.map((t: any) => String(t._id));
  }

  const criancas = await CriancaRepository.find(
    { _id: { $in: requester.criancasVinculadas ?? [] } },
    { turmaId: 1 },
  );
  return criancas
    .map((c: any) => c.turmaId)
    .filter(Boolean)
    .map((id: unknown) => String(id));
};

export const listEventosService = async (
  requester: IUsuario,
  filters: IListEventosFilters,
): Promise<IEventoComFotosUrl[]> => {
  const query: Record<string, unknown> = {};

  if (requester.papel !== "admin") {
    const turmaIds = await resolveTurmaIdsVisiveis(requester);
    query.$or = [
      { turmaId: { $exists: false } },
      { turmaId: { $in: turmaIds } },
    ];
  }

  if (requester.papel === "responsavel") {
    query.publicado = true;
  }

  if (filters.turmaId) {
    query.turmaId = filters.turmaId;
  }

  if (filters.ano) {
    query.data = {
      $gte: new Date(Date.UTC(filters.ano, 0, 1)),
      $lt: new Date(Date.UTC(filters.ano + 1, 0, 1)),
    };
  }

  const eventos = (await EventoRepository.find(query, null, {
    sort: { data: -1 },
  })) as IEvento[];

  return withFotosUrls(eventos);
};
