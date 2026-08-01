import { limparAnexosOrfaosService } from "../../services/anexos/limparAnexosOrfaos";

export const execute = async (): Promise<void> => {
  const { removidos } = await limparAnexosOrfaosService();

  console.log("limparAnexosOrfaos", { removidos });
};
