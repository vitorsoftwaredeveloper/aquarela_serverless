import { CriancaRepository } from "../../repositories/crianca.repository";
import { AgendaRepository } from "../../repositories/agenda.repository";
import { ICrianca } from "../../types/criancas";
import { IUsuario } from "../../types/usuarios";
import { getTurmaByIdService } from "./getTurmaById";
import { withFotoUrls } from "../shared/fotoCrianca";
import { hojeMeiaNoiteBrasil } from "../../utils/date";

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
    { turmaId, data: hojeMeiaNoiteBrasil() },
    { criancaId: 1, enviadaEm: 1 },
  )) as { criancaId: unknown; enviadaEm?: Date | null }[];

  const registradasHoje = new Set(
    agendasHoje.map((agenda) => String(agenda.criancaId)),
  );
  const enviadasHoje = new Set(
    agendasHoje
      .filter((agenda) => Boolean(agenda.enviadaEm))
      .map((agenda) => String(agenda.criancaId)),
  );

  return withFotoUrls(
    criancas.map((crianca) => ({
      ...crianca,
      agendaRegistradaHoje: registradasHoje.has(String(crianca._id)),
      agendaEnviadaHoje: enviadasHoje.has(String(crianca._id)),
    })),
  );
};
