import { UsuarioRepository } from "../../repositories/usuario.repository";
import { CriancaRepository } from "../../repositories/crianca.repository";
import { ProfessorRepository } from "../../repositories/professor.repository";
import { TurmaRepository } from "../../repositories/turma.repository";
import { removeCognitoUser } from "../../libs/cognito";
import { IUsuario } from "../../types/usuarios";
import { IProfessor } from "../../types/professores";
import { httpError, STATUS_CODE } from "../../utils/errors";

export const removeUsuarioService = async (
  usuarioId: string,
): Promise<void> => {
  const usuario = (await UsuarioRepository.findById(
    usuarioId,
  )) as IUsuario | null;

  if (!usuario) {
    throw httpError(
      STATUS_CODE.NOT_FOUND,
      "NOT_FOUND",
      "Usuário não encontrado.",
    );
  }

  // Bloqueia hard delete se ainda há vínculos ativos que ficariam órfãos.
  const criancasVinculadas = await CriancaRepository.count({
    "responsaveis.usuarioId": usuarioId,
    ativo: true,
  });
  if (criancasVinculadas > 0) {
    throw httpError(
      STATUS_CODE.CONFLICT,
      "USUARIO_COM_VINCULOS",
      "Usuário é responsável por crianças ativas. Desvincule antes de excluir.",
    );
  }

  const professor = (await ProfessorRepository.findOne({
    usuarioId,
  })) as IProfessor | null;
  if (professor) {
    const turmasVinculadas = await TurmaRepository.count({
      professorId: professor._id,
      ativo: true,
    });
    if (turmasVinculadas > 0) {
      throw httpError(
        STATUS_CODE.CONFLICT,
        "USUARIO_COM_VINCULOS",
        "Professor possui turmas ativas. Reatribua as turmas antes de excluir.",
      );
    }
  }

  // Hard delete: remove do Cognito e do banco.
  // Tolera usuário já ausente no Cognito para não travar a limpeza do banco.
  try {
    await removeCognitoUser(usuario.email);
  } catch (err) {
    if ((err as { name?: string }).name !== "UserNotFoundException") {
      throw err;
    }
  }

  await UsuarioRepository.deleteOne({ _id: usuarioId });

  // Apaga o Professor junto: senão `Professor.usuarioId` (required, ref
  // "usuarios") fica órfão apontando pro usuário recém-removido.
  if (professor) {
    await ProfessorRepository.deleteOne({ _id: professor._id });
  }
};
