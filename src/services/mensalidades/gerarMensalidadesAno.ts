import { CriancaRepository } from "../../repositories/crianca.repository";
import { ICrianca } from "../../types/criancas";
import { criarMensalidadeSeNaoExiste } from "./criarMensalidadeSeNaoExiste";
import { IGerarMensalidadesResult } from "./gerarMensalidadesDoMes";

export const gerarMensalidadesAnoService = async (
  ano: number,
): Promise<IGerarMensalidadesResult> => {
  const criancas = (await CriancaRepository.find({})) as ICrianca[];

  let geradas = 0;
  let ignoradas = 0;

  for (const crianca of criancas) {
    for (let mes = 1; mes <= 12; mes += 1) {
      const criada = await criarMensalidadeSeNaoExiste(
        crianca._id,
        crianca.financeiro,
        ano,
        mes,
      );
      if (criada) {
        geradas += 1;
      } else {
        ignoradas += 1;
      }
    }
  }

  return { geradas, ignoradas };
};
