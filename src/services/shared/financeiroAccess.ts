import { CriancaRepository } from "../../repositories/crianca.repository";
import { ICrianca } from "../../types/criancas";
import { IUsuario } from "../../types/usuarios";
import { httpError, STATUS_CODE } from "../../utils/errors";

const isResponsavelDaCrianca = (crianca: ICrianca, usuario: IUsuario): boolean =>
  crianca.responsaveis.some(
    (responsavel) => String(responsavel.usuarioId ?? "") === String(usuario._id),
  ) ||
  (usuario.criancasVinculadas ?? []).some(
    (id) => String(id) === String(crianca._id),
  );

/**
 * Carrega a criança e confirma acesso a dados financeiros: admin vê
 * qualquer uma, responsável só a do próprio filho. Usado por
 * mensalidades/pagamentos.
 */
export const loadCriancaParaFinanceiro = async (
  requester: IUsuario,
  criancaId: string,
): Promise<ICrianca> => {
  const crianca = (await CriancaRepository.findById(
    criancaId,
  )) as ICrianca | null;
  if (!crianca) {
    throw httpError(
      STATUS_CODE.NOT_FOUND,
      "NOT_FOUND",
      "Criança não encontrada.",
    );
  }

  if (
    requester.papel === "responsavel" &&
    !isResponsavelDaCrianca(crianca, requester)
  ) {
    throw httpError(
      STATUS_CODE.FORBIDDEN,
      "FORBIDDEN",
      "Acesso permitido apenas ao próprio filho.",
    );
  }

  return crianca;
};
