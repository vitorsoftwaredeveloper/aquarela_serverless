import {
  ConfigPrecosRepository,
  CONFIG_PRECOS_ID,
} from "../../repositories/configPrecos.repository";
import { IConfigPrecos } from "../../types/configPrecos";

export const getConfigPrecosService = async (): Promise<IConfigPrecos> => {
  const config = (await ConfigPrecosRepository.findOne({
    _id: CONFIG_PRECOS_ID,
  })) as IConfigPrecos | null;

  return {
    _id: CONFIG_PRECOS_ID,
    planos: [],
    inadimplencia: { diaCorte: 10, mesesCarencia: 1 },
    ...config,
  };
};
