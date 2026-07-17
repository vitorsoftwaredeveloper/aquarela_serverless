import { desvincularCriancaTurma } from "../shared/vincularCriancaTurma";

export const desvincularCriancaService = async (
  turmaId: string,
  criancaId: string,
): Promise<void> => desvincularCriancaTurma(turmaId, criancaId);
