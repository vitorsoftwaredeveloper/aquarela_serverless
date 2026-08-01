import { db } from "../../libs/mongo";
import { MensalidadeRepository } from "../../repositories/mensalidade.repository";
import { getConfigPrecosService } from "../configPrecos/getConfigPrecos";
import { dataBrasil } from "../../utils/date";
import { IMensalidade } from "../../types/mensalidades";

/**
 * Marca `inadimplenteDesde` nas mensalidades não pagas que já passaram do
 * corte configurado (`configPrecos.inadimplencia`). Só grava — nunca
 * desmarca: a limpeza do campo é responsabilidade exclusiva do caminho de
 * pagamento (PIX, webhook ou manual), que roda na mesma transação da baixa.
 * Idempotente por construção: o filtro já exclui quem já tem o campo
 * setado, então reexecuções no mesmo dia não reprocessam nada.
 */
export const marcarInadimplentesService = async (): Promise<{
  marcadas: number;
}> => {
  await db();

  const { inadimplencia } = await getConfigPrecosService();
  const { diaCorte, mesesCarencia } = inadimplencia;

  const agora = new Date();

  const candidatas = (await MensalidadeRepository.find({
    status: { $in: ["aberto", "atrasado"] },
    inadimplenteDesde: null,
  })) as IMensalidade[];

  const operacoes = candidatas
    .map((mensalidade) => {
      const corte = dataBrasil(
        mensalidade.ano,
        mensalidade.mes + mesesCarencia,
        diaCorte,
      );
      if (agora < corte) return null;
      return {
        updateOne: {
          filter: { _id: mensalidade._id },
          update: { $set: { inadimplenteDesde: corte } },
        },
      };
    })
    .filter((op): op is NonNullable<typeof op> => op !== null);

  if (operacoes.length > 0) {
    await MensalidadeRepository.model.bulkWrite(operacoes);
  }

  return { marcadas: operacoes.length };
};
