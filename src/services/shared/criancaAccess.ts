import { ICrianca, IResponsavel } from "../../types/criancas";
import { IUsuario } from "../../types/usuarios";
import { onlyDigits } from "../../utils/cpf";
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
 * responsável baixar a própria mensalidade.
 */
export const CAMPOS_EXCLUSIVOS_ADMIN = ["financeiro"] as const;

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

const throwPodeRetirarExclusivoAdmin = (): never => {
  throw httpError(
    STATUS_CODE.FORBIDDEN,
    "PODE_RETIRAR_EXCLUSIVO_ADMIN",
    "Apenas a administração pode autorizar quem pode retirar a criança.",
  );
};

const throwResponsavelExclusivoAdmin = (): never => {
  throw httpError(
    STATUS_CODE.FORBIDDEN,
    "RESPONSAVEL_EXCLUSIVO_ADMIN",
    "Apenas a administração pode adicionar um novo responsável.",
  );
};

export const assertMutacaoResponsaveis = (
  requester: IUsuario,
  crianca: Pick<ICrianca, "responsaveis">,
  payload: Partial<Pick<ICrianca, "responsaveis">>,
): void => {
  if (requester.papel === "admin" || !payload.responsaveis) return;

  const porCpf = new Map<string, IResponsavel>(
    crianca.responsaveis.map((responsavel) => [
      onlyDigits(responsavel.cpf),
      responsavel,
    ]),
  );
  const porUsuarioId = new Map<string, IResponsavel>(
    crianca.responsaveis
      .filter((responsavel) => responsavel.usuarioId)
      .map((responsavel) => [String(responsavel.usuarioId), responsavel]),
  );
  const casados = new Set<IResponsavel>();

  for (const novo of payload.responsaveis) {
    const porCpfMatch = porCpf.get(onlyDigits(novo.cpf));
    const porUsuarioIdMatch = novo.usuarioId
      ? porUsuarioId.get(String(novo.usuarioId))
      : undefined;

    if (
      porCpfMatch &&
      porUsuarioIdMatch &&
      porCpfMatch !== porUsuarioIdMatch
    ) {
      throwResponsavelExclusivoAdmin();
    }

    const existente = porCpfMatch ?? porUsuarioIdMatch;

    if (!existente) {
      throwResponsavelExclusivoAdmin();
      continue;
    }

    casados.add(existente);

    if (
      String(existente.usuarioId ?? "") !== String(novo.usuarioId ?? "") ||
      existente.podeRetirar !== novo.podeRetirar
    ) {
      throwPodeRetirarExclusivoAdmin();
    }
  }

  for (const antigo of crianca.responsaveis) {
    if (antigo.podeRetirar && !casados.has(antigo)) {
      throwPodeRetirarExclusivoAdmin();
    }
  }
};
