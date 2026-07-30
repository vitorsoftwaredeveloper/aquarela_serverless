import { gerarMensalidadesAnoService } from "../../services/mensalidades/gerarMensalidadesAno";

export const execute = async (): Promise<void> => {
  const now = new Date();
  const ano = now.getUTCFullYear();

  const resultado = await gerarMensalidadesAnoService(ano);
  console.log("gerarMensalidadesAno", { ano, ...resultado });
};
