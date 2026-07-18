import { db } from "../../libs/mongo";
import { MensalidadeRepository } from "../../repositories/mensalidade.repository";

/**
 * Mensalidades "aberto" com vencimento no passado viram "atrasado". Chamado
 * antes de leituras que dependem do status persistido (listagem,
 * inadimplentes, balanço) — mantém a query documentada em docs/04
 * (`mensalidades.find({ status: "atrasado" })`) funcionando sem depender
 * de um job separado só para essa transição.
 */
export const atualizarMensalidadesAtrasadas = async (
  filter: Record<string, unknown> = {},
): Promise<void> => {
  await db();
  await MensalidadeRepository.model.updateMany(
    { ...filter, status: "aberto", vencimento: { $lt: new Date() } },
    { $set: { status: "atrasado" } },
  );
};
