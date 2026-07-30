import { db } from "../../libs/mongo";
import { AgendaRepository } from "../../repositories/agenda.repository";

export const removerAgendasAnoAnteriorService = async (): Promise<{
  removidos: number;
}> => {
  await db();

  const anoAtual = new Date().getUTCFullYear();
  const limite = new Date(Date.UTC(anoAtual, 0, 1));

  const resultado = await AgendaRepository.model.deleteMany({
    data: { $lt: limite },
  });

  return { removidos: resultado.deletedCount ?? 0 };
};
