import { getConfigPrecosService } from "./getConfigPrecos";
import { IPlano } from "../../types/configPrecos";

export const listPlanosService = async (): Promise<IPlano[]> => {
  const config = await getConfigPrecosService();
  return config.planos;
};
