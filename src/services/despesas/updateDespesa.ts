import { DespesaRepository } from "../../repositories/despesa.repository";
import { IDespesa, IUpdateDespesaPayload } from "../../types/despesas";
import { httpError, STATUS_CODE } from "../../utils/errors";

export const updateDespesaService = async (
  despesaId: string,
  payload: IUpdateDespesaPayload,
): Promise<IDespesa> => {
  const despesa = (await DespesaRepository.findById(
    despesaId,
  )) as IDespesa | null;
  if (!despesa) {
    throw httpError(STATUS_CODE.NOT_FOUND, "NOT_FOUND", "Despesa não encontrada.");
  }

  const update: Record<string, unknown> = { ...payload };
  if (payload.data) {
    update.data = new Date(payload.data);
  }

  await DespesaRepository.updateOne({ _id: despesaId }, { $set: update });

  return (await DespesaRepository.findById(despesaId)) as IDespesa;
};
