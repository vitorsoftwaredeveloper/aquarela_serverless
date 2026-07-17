import { CriancaRepository } from "../../repositories/crianca.repository";
import { TurmaRepository } from "../../repositories/turma.repository";
import { ICreateCriancaPayload, ICrianca } from "../../types/criancas";
import { isValidCpf } from "../../utils/cpf";
import {
  httpError,
  STATUS_CODE,
  DUPLICATE_KEY_ERROR_CODE,
} from "../../utils/errors";

export const createCriancaService = async (
  payload: ICreateCriancaPayload,
): Promise<ICrianca> => {
  if (!isValidCpf(payload.cpf)) {
    throw httpError(STATUS_CODE.BAD_REQUEST, "INVALID_CPF", "CPF da criança inválido.");
  }

  for (const responsavel of payload.responsaveis) {
    if (!isValidCpf(responsavel.cpf)) {
      throw httpError(
        STATUS_CODE.BAD_REQUEST,
        "INVALID_CPF",
        `CPF do responsável "${responsavel.nome}" inválido.`,
      );
    }
  }

  if (payload.turmaId) {
    const turma = await TurmaRepository.findById(payload.turmaId);
    if (!turma || !(turma as any).ativo) {
      throw httpError(STATUS_CODE.NOT_FOUND, "NOT_FOUND", "Turma não encontrada.");
    }
  }

  try {
    const created = await CriancaRepository.insertOne({
      nome: payload.nome,
      dataNascimento: new Date(payload.dataNascimento),
      cpf: payload.cpf,
      foto: payload.foto,
      turmaId: payload.turmaId ?? null,
      responsaveis: payload.responsaveis,
      saude: payload.saude ?? {},
      financeiro: payload.financeiro,
      auditoria: [],
      ativo: true,
    });

    return (await CriancaRepository.findById(created._id)) as ICrianca;
  } catch (error: any) {
    if (error.code === DUPLICATE_KEY_ERROR_CODE) {
      throw httpError(
        STATUS_CODE.CONFLICT,
        "CPF_IN_USE",
        "Já existe uma criança cadastrada com este CPF.",
      );
    }
    throw error;
  }
};
