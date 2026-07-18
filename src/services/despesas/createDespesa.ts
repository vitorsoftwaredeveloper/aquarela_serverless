import { DespesaRepository } from "../../repositories/despesa.repository";
import { ICreateDespesaPayload, IDespesa } from "../../types/despesas";
import { IUsuario } from "../../types/usuarios";

export const createDespesaService = async (
  requester: IUsuario,
  payload: ICreateDespesaPayload,
): Promise<IDespesa> => {
  const created = await DespesaRepository.insertOne({
    descricao: payload.descricao,
    categoria: payload.categoria,
    valor: payload.valor,
    data: new Date(payload.data),
    lancadoPor: requester._id,
    anexoUrl: payload.anexoUrl,
  });

  return (await DespesaRepository.findById(created._id)) as IDespesa;
};
