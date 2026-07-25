import { CriancaRepository } from "../../repositories/crianca.repository";
import { AgendaRepository } from "../../repositories/agenda.repository";
import { ICrianca } from "../../types/criancas";
import { IUsuario } from "../../types/usuarios";
import { getTurmaByIdService } from "./getTurmaById";
import { withFotoUrls } from "../shared/fotoCrianca";

const hojeMeiaNoite = (): Date => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

export const listCriancasDaTurmaService = async (
  requester: IUsuario,
  turmaId: string,
): Promise<ICrianca[]> => {
  // valida existência da turma + ownership (professor só a sua)
  await getTurmaByIdService(requester, turmaId);

  const criancas = (await CriancaRepository.find(
    { turmaId, ativo: true },
    null,
    { sort: { nome: 1 } },
  )) as ICrianca[];

  if (criancas.length === 0) return criancas;

  const agendasHoje = (await AgendaRepository.find(
    { turmaId, data: hojeMeiaNoite() },
    { criancaId: 1 },
  )) as { criancaId: unknown }[];

  const registradasHoje = new Set(
    agendasHoje.map((agenda) => String(agenda.criancaId)),
  );

  return withFotoUrls(
    criancas.map((crianca) => ({
      ...crianca,
      agendaRegistradaHoje: registradasHoje.has(String(crianca._id)),
    })),
  );
};
