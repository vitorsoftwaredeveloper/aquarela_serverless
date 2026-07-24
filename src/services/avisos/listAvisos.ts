import { AvisoRepository } from "../../repositories/aviso.repository";
import { TurmaRepository } from "../../repositories/turma.repository";
import { CriancaRepository } from "../../repositories/crianca.repository";
import { IAviso } from "../../types/avisos";
import { IUsuario } from "../../types/usuarios";
import { resolveProfessorId } from "../../utils/requester";

export interface IListAvisosFilters {
  ativo?: boolean;
}

const resolveTurmaIdsVisiveis = async (
  requester: IUsuario,
): Promise<string[]> => {
  if (requester.papel === "professor") {
    const professorId = await resolveProfessorId(requester);
    const turmas = await TurmaRepository.find({ professorId }, { _id: 1 });
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

export const listAvisosService = async (
  requester: IUsuario,
  filters: IListAvisosFilters,
): Promise<IAviso[]> => {
  if (requester.papel === "admin") {
    const query: Record<string, unknown> = {};
    if (filters.ativo !== undefined) query.ativo = filters.ativo;

    return (await AvisoRepository.find(query, null, {
      sort: { createdAt: -1 },
    })) as IAviso[];
  }

  const turmaIds = await resolveTurmaIdsVisiveis(requester);

  return (await AvisoRepository.find(
    {
      ativo: true,
      $or: [{ turmaId: { $exists: false } }, { turmaId: { $in: turmaIds } }],
    },
    null,
    { sort: { createdAt: -1 } },
  )) as IAviso[];
};
