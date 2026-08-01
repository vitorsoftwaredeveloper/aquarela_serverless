import { MensalidadeRepository } from "../../repositories/mensalidade.repository";
import { CriancaRepository } from "../../repositories/crianca.repository";
import { IMensalidade } from "../../types/mensalidades";
import { ICrianca, IResponsavel } from "../../types/criancas";

export interface IInadimplente {
  mensalidade: IMensalidade;
  crianca: { _id: string; nome: string; responsaveis: IResponsavel[] };
}

/**
 * "Inadimplente" ≠ "atrasado": atrasado é vencimento + 1 dia (cobrável, em
 * vermelho pro responsável); inadimplente é o estado formal depois da
 * carência configurável, marcado pelo cron `marcarInadimplentes` em
 * `mensalidade.inadimplenteDesde`. Esta lista filtra só o segundo.
 */
export const getInadimplentesService = async (): Promise<IInadimplente[]> => {
  const mensalidades = (await MensalidadeRepository.find(
    { inadimplenteDesde: { $ne: null } },
    null,
    { sort: { inadimplenteDesde: 1 } },
  )) as IMensalidade[];

  if (mensalidades.length === 0) {
    return [];
  }

  const criancaIds = [
    ...new Set(mensalidades.map((mensalidade) => String(mensalidade.criancaId))),
  ];
  const criancas = (await CriancaRepository.find(
    { _id: { $in: criancaIds } },
    { nome: 1, responsaveis: 1 },
  )) as ICrianca[];
  const criancaById = new Map(
    criancas.map((crianca) => [String(crianca._id), crianca]),
  );

  return mensalidades.map((mensalidade) => {
    const crianca = criancaById.get(String(mensalidade.criancaId));
    return {
      mensalidade,
      crianca: {
        _id: String(mensalidade.criancaId),
        nome: crianca?.nome ?? "",
        responsaveis: crianca?.responsaveis ?? [],
      },
    };
  });
};
