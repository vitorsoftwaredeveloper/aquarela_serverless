import { MensalidadeRepository } from "../../repositories/mensalidade.repository";
import { IFinanceiroCrianca } from "../../types/criancas";
import { DUPLICATE_KEY_ERROR_CODE } from "../../utils/errors";

/**
 * Insere a mensalidade de {criancaId, ano, mes} se ainda não existir —
 * o índice único {criancaId, ano, mes} garante a idempotência. Retorna
 * `true` se criou, `false` se já existia (silenciosamente ignorado).
 */
export const criarMensalidadeSeNaoExiste = async (
  criancaId: string,
  financeiro: IFinanceiroCrianca,
  ano: number,
  mes: number,
): Promise<boolean> => {
  const vencimento = new Date(
    Date.UTC(ano, mes - 1, financeiro.diaVencimento),
  );

  try {
    await MensalidadeRepository.insertOne({
      criancaId,
      ano,
      mes,
      valor: financeiro.valorMensalidade,
      vencimento,
      status: "aberto",
    });
    return true;
  } catch (error: any) {
    if (error.code === DUPLICATE_KEY_ERROR_CODE) return false;
    throw error;
  }
};
