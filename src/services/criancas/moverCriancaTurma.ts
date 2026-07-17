import { ICrianca } from "../../types/criancas";
import { vincularCriancaTurma } from "../shared/vincularCriancaTurma";

export const moverCriancaTurmaService = async (
  criancaId: string,
  turmaId: string,
): Promise<ICrianca> => vincularCriancaTurma(criancaId, turmaId);
