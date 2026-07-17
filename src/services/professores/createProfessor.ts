import { ProfessorRepository } from "../../repositories/professor.repository";
import { UsuarioRepository } from "../../repositories/usuario.repository";
import { ICreateProfessorPayload, IProfessor } from "../../types/professores";
import { IUsuario } from "../../types/usuarios";
import { isValidCpf } from "../../utils/cpf";
import {
  httpError,
  STATUS_CODE,
  DUPLICATE_KEY_ERROR_CODE,
} from "../../utils/errors";

export const createProfessorService = async (
  payload: ICreateProfessorPayload,
): Promise<IProfessor> => {
  if (!isValidCpf(payload.cpf)) {
    throw httpError(STATUS_CODE.BAD_REQUEST, "INVALID_CPF", "CPF inválido.");
  }

  const usuario = (await UsuarioRepository.findById(
    payload.usuarioId,
  )) as IUsuario | null;

  if (!usuario || !usuario.ativo) {
    throw httpError(
      STATUS_CODE.NOT_FOUND,
      "USUARIO_NOT_FOUND",
      "Usuário não encontrado.",
    );
  }

  if (usuario.papel !== "professor") {
    throw httpError(
      STATUS_CODE.UNPROCESSABLE_ENTITY,
      "USUARIO_PAPEL_INVALIDO",
      "O usuário vinculado precisa ter papel 'professor'.",
    );
  }

  const existingProfessor = await ProfessorRepository.findOne({
    usuarioId: payload.usuarioId,
  });
  if (existingProfessor) {
    throw httpError(
      STATUS_CODE.CONFLICT,
      "USUARIO_JA_VINCULADO",
      "Este usuário já está vinculado a um cadastro de professor.",
    );
  }

  try {
    const created = await ProfessorRepository.insertOne({
      usuarioId: payload.usuarioId,
      nome: payload.nome,
      cpf: payload.cpf,
      telefone: payload.telefone,
      email: payload.email.toLowerCase(),
      formacao: payload.formacao,
      ativo: true,
    });

    return (await ProfessorRepository.findById(created._id)) as IProfessor;
  } catch (error: any) {
    if (error.code === DUPLICATE_KEY_ERROR_CODE) {
      throw httpError(
        STATUS_CODE.CONFLICT,
        "USUARIO_JA_VINCULADO",
        "Este usuário já está vinculado a um cadastro de professor.",
      );
    }
    throw error;
  }
};
