import { CriancaRepository } from "../../repositories/crianca.repository";
import { MensalidadeRepository } from "../../repositories/mensalidade.repository";
import { ICrianca } from "../../types/criancas";
import { DUPLICATE_KEY_ERROR_CODE } from "../../utils/errors";

export interface IGerarMensalidadesResult {
  geradas: number;
  ignoradas: number;
}

/**
 * Gera a mensalidade do mês para cada criança ativa a partir de
 * `crianca.financeiro`. Idempotente: mensalidades já existentes (índice
 * único {criancaId, ano, mes}) são silenciosamente ignoradas — seguro
 * reexecutar (reprocessamento manual, retry do job).
 */
export const gerarMensalidadesDoMesService = async (
  ano: number,
  mes: number,
): Promise<IGerarMensalidadesResult> => {
  const criancas = (await CriancaRepository.find({
    ativo: true,
  })) as ICrianca[];

  let geradas = 0;
  let ignoradas = 0;

  for (const crianca of criancas) {
    const vencimento = new Date(
      Date.UTC(ano, mes - 1, crianca.financeiro.diaVencimento),
    );

    try {
      await MensalidadeRepository.insertOne({
        criancaId: crianca._id,
        ano,
        mes,
        valor: crianca.financeiro.valorMensalidade,
        vencimento,
        status: "aberto",
      });
      geradas += 1;
    } catch (error: any) {
      if (error.code === DUPLICATE_KEY_ERROR_CODE) {
        ignoradas += 1;
        continue;
      }
      throw error;
    }
  }

  return { geradas, ignoradas };
};
