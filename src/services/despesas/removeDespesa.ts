import { DespesaRepository } from "../../repositories/despesa.repository";
import { IDespesa } from "../../types/despesas";
import { httpError, STATUS_CODE } from "../../utils/errors";

export const removeDespesaService = async (despesaId: string): Promise<void> => {
  const despesa = (await DespesaRepository.findById(
    despesaId,
  )) as IDespesa | null;
  if (!despesa) {
    throw httpError(STATUS_CODE.NOT_FOUND, "NOT_FOUND", "Despesa não encontrada.");
  }

  await DespesaRepository.deleteOne({ _id: despesaId });
};
