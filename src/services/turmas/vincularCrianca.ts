import { ICrianca } from "../../types/criancas";
import { vincularCriancaTurma } from "../shared/vincularCriancaTurma";

export const vincularCriancaService = async (
  turmaId: string,
  criancaId: string,
): Promise<ICrianca> => vincularCriancaTurma(criancaId, turmaId);
