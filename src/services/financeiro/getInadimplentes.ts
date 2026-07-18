import { MensalidadeRepository } from "../../repositories/mensalidade.repository";
import { CriancaRepository } from "../../repositories/crianca.repository";
import { IMensalidade } from "../../types/mensalidades";
import { ICrianca, IResponsavel } from "../../types/criancas";
import { atualizarMensalidadesAtrasadas } from "../shared/mensalidadeStatus";

export interface IInadimplente {
  mensalidade: IMensalidade;
  crianca: { _id: string; nome: string; responsaveis: IResponsavel[] };
}

export const getInadimplentesService = async (): Promise<IInadimplente[]> => {
  await atualizarMensalidadesAtrasadas();

  const mensalidades = (await MensalidadeRepository.find(
    { status: "atrasado" },
    null,
    { sort: { vencimento: 1 } },
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
