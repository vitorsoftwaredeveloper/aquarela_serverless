import { TurmaRepository } from "../../repositories/turma.repository";
import { ProfessorRepository } from "../../repositories/professor.repository";
import { ICreateTurmaPayload, ITurma } from "../../types/turmas";
import { httpError, STATUS_CODE } from "../../utils/errors";

export const createTurmaService = async (
  payload: ICreateTurmaPayload,
): Promise<ITurma> => {
  if (payload.faixaEtaria.min > payload.faixaEtaria.max) {
    throw httpError(
      STATUS_CODE.BAD_REQUEST,
      "FAIXA_ETARIA_INVALIDA",
      "Idade mínima não pode ser maior que a máxima.",
    );
  }

  const professores = await ProfessorRepository.find({
    _id: { $in: payload.professorIds },
  });
  if (professores.length !== new Set(payload.professorIds).size) {
    throw httpError(
      STATUS_CODE.NOT_FOUND,
      "PROFESSOR_NOT_FOUND",
      "Professor não encontrado.",
    );
  }

  const created = await TurmaRepository.insertOne({
    nome: payload.nome,
    descricao: payload.descricao,
    faixaEtaria: payload.faixaEtaria,
    professorIds: payload.professorIds,
    capacidade: payload.capacidade,
  });

  return (await TurmaRepository.findById(created._id)) as ITurma;
};
