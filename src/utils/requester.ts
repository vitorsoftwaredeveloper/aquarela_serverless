import { AuthClaims } from "../types/auth";
import { IUsuario } from "../types/usuarios";
import { UsuarioRepository } from "../repositories/usuario.repository";
import { ProfessorRepository } from "../repositories/professor.repository";
import { httpError, STATUS_CODE } from "./errors";

const CACHE_TTL_MS = 5 * 60 * 1000;

interface ICacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * Cache em memória do container Lambda (warm start reaproveita). Evita 2
 * queries fixas (`usuarios` + `professores`) em toda invocação autenticada;
 * TTL curto porque papel/vínculo raramente muda no meio de uma sessão.
 */
const requesterCache = new Map<string, ICacheEntry<IUsuario>>();
const professorIdCache = new Map<string, ICacheEntry<string>>();

const getCached = <T>(
  cache: Map<string, ICacheEntry<T>>,
  key: string,
): T | undefined => {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt < Date.now()) {
    cache.delete(key);
    return undefined;
  }
  return entry.value;
};

const setCached = <T>(
  cache: Map<string, ICacheEntry<T>>,
  key: string,
  value: T,
): void => {
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
};

/**
 * Resolve o `usuarios` correspondente ao token autenticado. Necessário para
 * checagens de ownership (professor só vê suas turmas, responsável só o
 * próprio filho) já que o JWT só carrega o `cognitoSub`, não o `_id` do
 * domínio nem os vínculos.
 */
export const resolveRequester = async (
  auth: AuthClaims,
): Promise<IUsuario> => {
  const cached = getCached(requesterCache, auth.sub);
  if (cached) return cached;

  const usuario = (await UsuarioRepository.findOne({
    cognitoSub: auth.sub,
  })) as IUsuario | null;

  if (!usuario) {
    throw httpError(STATUS_CODE.FORBIDDEN, "FORBIDDEN", "Usuário sem acesso.");
  }

  setCached(requesterCache, auth.sub, usuario);
  return usuario;
};

/**
 * Resolve o `_id` do cadastro de `professores` vinculado ao usuário logado.
 * Usado para restringir turmas/crianças ao professor dono da turma.
 */
export const resolveProfessorId = async (
  usuario: IUsuario,
): Promise<string> => {
  const cached = getCached(professorIdCache, String(usuario._id));
  if (cached) return cached;

  const professor = await ProfessorRepository.findOne({
    usuarioId: usuario._id,
  });

  if (!professor) {
    throw httpError(
      STATUS_CODE.FORBIDDEN,
      "FORBIDDEN",
      "Professor sem cadastro vinculado.",
    );
  }

  const professorId = String((professor as any)._id);
  setCached(professorIdCache, String(usuario._id), professorId);
  return professorId;
};
