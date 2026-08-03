import {
  ConfigPrecosRepository,
  CONFIG_PRECOS_ID,
} from "../../repositories/configPrecos.repository";
import { IConfigPrecos } from "../../types/configPrecos";

export const DIAS_CARENCIA_PADRAO = 10;

/**
 * `inadimplencia` é reconstruída campo a campo em vez de vir do spread: o
 * documento gravado antes de 02/08/2026 guarda o formato antigo
 * (`{ diaCorte, mesesCarencia }`), que o schema do Mongoose descarta na
 * leitura. Sem esta normalização o serviço devolveria `{}` e o cron nunca
 * marcaria ninguém. Vale como migração — o formato antigo some no primeiro
 * `PUT /config/precos`.
 */
export const getConfigPrecosService = async (): Promise<IConfigPrecos> => {
  const config = (await ConfigPrecosRepository.findOne({
    _id: CONFIG_PRECOS_ID,
  })) as IConfigPrecos | null;

  return {
    _id: CONFIG_PRECOS_ID,
    planos: [],
    ...config,
    inadimplencia: {
      diasCarencia:
        config?.inadimplencia?.diasCarencia ?? DIAS_CARENCIA_PADRAO,
    },
  };
};
