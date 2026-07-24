import { IFinanceiroCrianca } from "../../types/criancas";
import { criarMensalidadeSeNaoExiste } from "./criarMensalidadeSeNaoExiste";

/**
 * Gera, no cadastro da criança, a mensalidade de cada mês do mês corrente
 * até dezembro do ano corrente — sem esperar o cron mensal
 * (gerarMensalidadesDoMes, que só roda dia 1 e portanto não cobriria o mês
 * de cadastro).
 */
export const gerarMensalidadesIniciaisService = async (
  criancaId: string,
  financeiro: IFinanceiroCrianca,
): Promise<void> => {
  const now = new Date();
  const ano = now.getUTCFullYear();
  const mesInicio = now.getUTCMonth() + 1;

  for (let mes = mesInicio; mes <= 12; mes += 1) {
    await criarMensalidadeSeNaoExiste(criancaId, financeiro, ano, mes);
  }
};
