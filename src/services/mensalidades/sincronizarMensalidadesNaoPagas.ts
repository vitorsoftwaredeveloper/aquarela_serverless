import { db } from "../../libs/mongo";
import { MensalidadeRepository } from "../../repositories/mensalidade.repository";
import { PagamentoRepository } from "../../repositories/pagamento.repository";
import { IFinanceiroCrianca } from "../../types/criancas";
import { IMensalidade } from "../../types/mensalidades";

export const sincronizarMensalidadesNaoPagas = async (
  criancaId: string,
  financeiro: IFinanceiroCrianca,
): Promise<number> => {
  await db();

  const filtroNaoPagas = { criancaId, status: { $ne: "pago" as const } };

  const naoPagas = (await MensalidadeRepository.find(filtroNaoPagas, {
    _id: 1,
  })) as Pick<IMensalidade, "_id">[];

  if (naoPagas.length === 0) return 0;

  const agora = new Date();

  await MensalidadeRepository.model.updateMany(
    filtroNaoPagas,
    [
      {
        $set: {
          valor: financeiro.valorMensalidade,
          vencimento: {
            $dateFromParts: {
              year: "$ano",
              month: "$mes",
              day: financeiro.diaVencimento,
            },
          },
        },
      },
      {
        $set: {
          status: {
            $cond: [
              { $in: ["$status", ["aberto", "atrasado"]] },
              {
                $cond: [{ $lt: ["$vencimento", agora] }, "atrasado", "aberto"],
              },
              "$status",
            ],
          },
        },
      },
    ],
    { updatePipeline: true },
  );

  await PagamentoRepository.model.deleteMany({
    mensalidadeId: { $in: naoPagas.map((mensalidade) => mensalidade._id) },
    status: { $ne: "pago" },
    valor: { $ne: financeiro.valorMensalidade },
  });

  return naoPagas.length;
};
