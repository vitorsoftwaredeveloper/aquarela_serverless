import { ICrianca } from "../../types/criancas";
import { IUsuario } from "../../types/usuarios";
import { httpError, STATUS_CODE } from "../../utils/errors";

/**
 * Vínculo responsável ↔ criança. Duas fontes porque `criancasVinculadas` no
 * usuário é um atalho de leitura que crianças antigas podem não ter — o
 * `usuarioId` gravado no responsável embutido cobre esses casos.
 */
export const isResponsavelDaCrianca = (
  crianca: ICrianca,
  usuario: IUsuario,
): boolean =>
  crianca.responsaveis.some(
    (responsavel) => String(responsavel.usuarioId ?? "") === String(usuario._id),
  ) ||
  (usuario.criancasVinculadas ?? []).some(
    (id) => String(id) === String(crianca._id),
  );

/**
 * Campos que só o admin altera. `financeiro` fora daqui deixaria o
 * responsável baixar a própria mensalidade; `ativo` deixaria reativar um
 * cadastro que a escola desligou.
 */
export const CAMPOS_EXCLUSIVOS_ADMIN = ["financeiro", "ativo"] as const;

/**
 * Autoriza a edição do cadastro: admin edita qualquer criança e qualquer
 * campo; responsável edita só o próprio filho e só os campos não
 * exclusivos do admin. Turma não passa por aqui — muda por
 * `PATCH /criancas/{id}/turma`, que é admin-only.
 */
export const assertPodeEditarCrianca = (
  requester: IUsuario,
  crianca: ICrianca,
  payload: Partial<Record<(typeof CAMPOS_EXCLUSIVOS_ADMIN)[number], unknown>>,
): void => {
  if (requester.papel === "admin") return;

  if (!isResponsavelDaCrianca(crianca, requester)) {
    throw httpError(
      STATUS_CODE.FORBIDDEN,
      "FORBIDDEN",
      "Acesso permitido apenas ao próprio filho.",
    );
  }

  const bloqueados = CAMPOS_EXCLUSIVOS_ADMIN.filter(
    (campo) => payload[campo] !== undefined,
  );

  if (bloqueados.length > 0) {
    throw httpError(
      STATUS_CODE.FORBIDDEN,
      "FORBIDDEN",
      `Apenas a administração pode alterar: ${bloqueados.join(", ")}.`,
    );
  }
};
