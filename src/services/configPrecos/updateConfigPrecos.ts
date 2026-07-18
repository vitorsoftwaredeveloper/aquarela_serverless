import {
  ConfigPrecosRepository,
  CONFIG_PRECOS_ID,
} from "../../repositories/configPrecos.repository";
import { IConfigPrecos, IUpdateConfigPrecosPayload } from "../../types/configPrecos";
import { IUsuario } from "../../types/usuarios";
import { httpError, STATUS_CODE } from "../../utils/errors";

export const updateConfigPrecosService = async (
  requester: IUsuario,
  payload: IUpdateConfigPrecosPayload,
): Promise<IConfigPrecos> => {
  const nomes = payload.planos.map((plano) => plano.nome.trim().toLowerCase());
  if (new Set(nomes).size !== nomes.length) {
    throw httpError(
      STATUS_CODE.BAD_REQUEST,
      "PLANO_DUPLICADO",
      "Não é possível cadastrar dois planos com o mesmo nome.",
    );
  }

  await ConfigPrecosRepository.updateOne(
    { _id: CONFIG_PRECOS_ID },
    { $set: { planos: payload.planos, atualizadoPor: requester._id } },
    { upsert: true },
  );

  return (await ConfigPrecosRepository.findOne({
    _id: CONFIG_PRECOS_ID,
  })) as IConfigPrecos;
};
