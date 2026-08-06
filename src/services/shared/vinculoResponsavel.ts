import { UsuarioRepository } from "../../repositories/usuario.repository";
import { IResponsavel } from "../../types/criancas";

export const usuarioIdsVinculados = (
  responsaveis: IResponsavel[],
): string[] => [
  ...new Set(
    responsaveis
      .map((responsavel) => responsavel.usuarioId)
      .filter((usuarioId): usuarioId is string => Boolean(usuarioId))
      .map(String),
  ),
];

export const sincronizarCriancasVinculadas = async (
  criancaId: string,
  antes: string[],
  depois: string[],
): Promise<void> => {
  const adicionados = depois.filter((usuarioId) => !antes.includes(usuarioId));
  const removidos = antes.filter((usuarioId) => !depois.includes(usuarioId));

  await Promise.all([
    ...adicionados.map((usuarioId) =>
      UsuarioRepository.updateOne(
        { _id: usuarioId },
        { $addToSet: { criancasVinculadas: criancaId } },
      ),
    ),
    ...removidos.map((usuarioId) =>
      UsuarioRepository.updateOne(
        { _id: usuarioId },
        { $pull: { criancasVinculadas: criancaId } },
      ),
    ),
  ]);
};
