import {
  ConfigPrecosRepository,
  CONFIG_PRECOS_ID,
} from "../../repositories/configPrecos.repository";
import { IConfigPrecos } from "../../types/configPrecos";
import { httpError, STATUS_CODE } from "../../utils/errors";

export interface ISimulacaoResultado {
  plano: string;
  meses: number;
  valorMensalCheio: number;
  percentualDesconto: number;
  valorMensalComDesconto: number;
  total: number;
}

/**
 * Aplica o maior desconto configurado cujo `meses` mínimo seja atingido
 * pelo período simulado (ex.: descontos de 6 e 12 meses, simulação de 8
 * meses usa o de 6). Sem desconto aplicável, cobra o valor cheio.
 */
export const simularMensalidadeService = async (
  planoNome: string,
  meses: number,
): Promise<ISimulacaoResultado> => {
  const config = (await ConfigPrecosRepository.findOne({
    _id: CONFIG_PRECOS_ID,
  })) as IConfigPrecos | null;

  const plano = config?.planos.find(
    (item) => item.nome.trim().toLowerCase() === planoNome.trim().toLowerCase(),
  );
  if (!plano) {
    throw httpError(STATUS_CODE.NOT_FOUND, "NOT_FOUND", "Plano não encontrado.");
  }

  const percentualDesconto = (plano.descontos ?? [])
    .filter((desconto) => meses >= desconto.meses)
    .reduce((maior, desconto) => Math.max(maior, desconto.percentual), 0);

  const valorMensalComDesconto = plano.valorMensal * (1 - percentualDesconto / 100);

  return {
    plano: plano.nome,
    meses,
    valorMensalCheio: plano.valorMensal,
    percentualDesconto,
    valorMensalComDesconto: Number(valorMensalComDesconto.toFixed(2)),
    total: Number((valorMensalComDesconto * meses).toFixed(2)),
  };
};
