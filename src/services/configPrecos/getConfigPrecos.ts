import {
  ConfigPrecosRepository,
  CONFIG_PRECOS_ID,
} from "../../repositories/configPrecos.repository";
import { IConfigPrecos } from "../../types/configPrecos";

export const getConfigPrecosService = async (): Promise<IConfigPrecos> => {
  const config = (await ConfigPrecosRepository.findOne({
    _id: CONFIG_PRECOS_ID,
  })) as IConfigPrecos | null;

  return config ?? { _id: CONFIG_PRECOS_ID, planos: [] };
};
