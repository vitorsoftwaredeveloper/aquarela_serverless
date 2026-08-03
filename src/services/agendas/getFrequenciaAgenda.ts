import { Types } from "mongoose";
import { AgendaRepository } from "../../repositories/agenda.repository";
import { IFrequenciaAgenda } from "../../types/agendas";
import { IUsuario } from "../../types/usuarios";
import { loadCriancaParaLeituraAgenda } from "../shared/agendaAccess";
import { httpError, STATUS_CODE } from "../../utils/errors";

interface IAgregadoPresenca {
  _id: string;
  total: number;
}

/**
 * Contagem de presença (`presente`/`falta`/`atrasado`) de uma criança num
 * período — AG2-09. Só conta dias com `presenca` registrada; dia sem esse
 * campo (agenda antiga ao formato prévio ao Épico L) não entra em nenhum
 * total. `de`/`ate` são obrigatórios: sem limite o agregado cruzaria com
 * anos já expurgados pelo cron `limparDadosAnoAnterior` sem nenhum aviso.
 */
export const getFrequenciaAgendaService = async (
  requester: IUsuario,
  criancaId: string,
  de: string,
  ate: string,
): Promise<IFrequenciaAgenda> => {
  await loadCriancaParaLeituraAgenda(requester, criancaId);

  const inicio = new Date(de);
  const fim = new Date(ate);
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) {
    throw httpError(
      STATUS_CODE.BAD_REQUEST,
      "BAD_REQUEST",
      "Parâmetros de e ate devem ser datas válidas (YYYY-MM-DD).",
    );
  }

  const porStatus = await AgendaRepository.model.aggregate<IAgregadoPresenca>([
    {
      $match: {
        criancaId: new Types.ObjectId(criancaId),
        data: { $gte: inicio, $lte: fim },
        "presenca.status": { $exists: true },
      },
    },
    { $group: { _id: "$presenca.status", total: { $sum: 1 } } },
  ]);

  const totalPorStatus = new Map(porStatus.map((item) => [item._id, item.total]));
  const presente = totalPorStatus.get("presente") ?? 0;
  const falta = totalPorStatus.get("falta") ?? 0;
  const atrasado = totalPorStatus.get("atrasado") ?? 0;

  return {
    criancaId,
    de,
    ate,
    presente,
    falta,
    atrasado,
    total: presente + falta + atrasado,
  };
};
