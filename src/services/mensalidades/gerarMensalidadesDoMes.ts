import { CriancaRepository } from "../../repositories/crianca.repository";
import { ICrianca } from "../../types/criancas";
import { criarMensalidadeSeNaoExiste } from "./criarMensalidadeSeNaoExiste";

export interface IGerarMensalidadesResult {
  geradas: number;
  ignoradas: number;
}

/**
 * Gera a mensalidade do mês para cada criança cadastrada a partir de
 * `crianca.financeiro`. Idempotente: mensalidades já existentes (índice
 * único {criancaId, ano, mes}) são silenciosamente ignoradas — seguro
 * reexecutar (reprocessamento manual, retry do job).
 */
export const gerarMensalidadesDoMesService = async (
  ano: number,
  mes: number,
): Promise<IGerarMensalidadesResult> => {
  const criancas = (await CriancaRepository.find({})) as ICrianca[];

  let geradas = 0;
  let ignoradas = 0;

  for (const crianca of criancas) {
    const criada = await criarMensalidadeSeNaoExiste(
      crianca._id,
      crianca.financeiro,
      ano,
      mes,
    );
    if (criada) {
      geradas += 1;
    } else {
      ignoradas += 1;
    }
  }

  return { geradas, ignoradas };
};
