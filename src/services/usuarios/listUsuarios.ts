import { UsuarioRepository } from "../../repositories/usuario.repository";
import { IUsuario } from "../../types/usuarios";
import { Role } from "../../types/auth";

export interface IListUsuariosFilters {
  papel?: Role;
}

export const listUsuariosService = async (
  filters: IListUsuariosFilters,
): Promise<IUsuario[]> => {
  const query: Record<string, unknown> = {};
  if (filters.papel) query.papel = filters.papel;

  return (await UsuarioRepository.find(query, null, {
    sort: { nome: 1 },
  })) as IUsuario[];
};
