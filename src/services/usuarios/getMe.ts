import { AuthClaims } from "../../types/auth";
import { IUsuario } from "../../types/usuarios";
import { ProfessorRepository } from "../../repositories/professor.repository";
import { resolveRequester } from "../../utils/requester";

/**
 * `usuarios.professorId` nunca é gravado na criação (ver `createProfessor`) —
 * o vínculo real é `professores.usuarioId`. Resolve aqui em vez de confiar no
 * campo do schema, senão o front nunca descobre o `_id` do próprio professor.
 */
export const getMeService = async (auth: AuthClaims): Promise<IUsuario> => {
  const usuario = await resolveRequester(auth);
  if (usuario.papel !== "professor") return usuario;

  const professor = await ProfessorRepository.findOne({
    usuarioId: usuario._id,
    ativo: true,
  });

  return professor
    ? { ...usuario, professorId: String((professor as any)._id) }
    : usuario;
};
