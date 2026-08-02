import { AgendaRepository } from "../../repositories/agenda.repository";
import { ProfessorRepository } from "../../repositories/professor.repository";
import { IAgendaDiaria } from "../../types/agendas";
import { IUsuario } from "../../types/usuarios";
import { loadCriancaParaLeituraAgenda } from "../shared/agendaAccess";
import { withFotoUrl } from "../shared/fotoProfessor";
import {
  IAgendaComAnexosUrl,
  withAgendaAnexosUrl,
} from "./withAgendaAnexosUrl";
import { httpError, STATUS_CODE } from "../../utils/errors";

export const getAgendaService = async (
  requester: IUsuario,
  criancaId: string,
  data: string,
): Promise<IAgendaComAnexosUrl> => {
  await loadCriancaParaLeituraAgenda(requester, criancaId);

  const agenda = (await AgendaRepository.findOne({
    criancaId,
    data: new Date(data),
  })) as IAgendaDiaria | null;

  if (!agenda) {
    throw httpError(
      STATUS_CODE.NOT_FOUND,
      "NOT_FOUND",
      "Registro de agenda não encontrado para esta data.",
    );
  }

  const professor = await ProfessorRepository.findById(agenda.registradoPor, {
    nome: 1,
    foto: 1,
  });
  if (professor) {
    const { fotoUrl } = await withFotoUrl(professor);
    agenda.professor = { _id: String(professor._id), nome: professor.nome, fotoUrl };
  }

  return withAgendaAnexosUrl(agenda);
};
