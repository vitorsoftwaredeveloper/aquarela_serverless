import { ProfessorRepository } from "../../repositories/professor.repository";
import { TurmaRepository } from "../../repositories/turma.repository";
import { UsuarioRepository } from "../../repositories/usuario.repository";
import { removeCognitoUser } from "../../libs/cognito";
import { IUsuario } from "../../types/usuarios";
import { httpError, STATUS_CODE } from "../../utils/errors";

/**
 * Hard delete do professor e do usuário dedicado (Cognito + `usuarios`)
 * juntos: manter o professor soft-deleted após apagar o usuário deixaria
 * `Professor.usuarioId` (required, ref "usuarios") órfão.
 */
export const removeProfessorService = async (
  professorId: string,
): Promise<void> => {
  const professor = await ProfessorRepository.findById(professorId);
  if (!professor) {
    throw httpError(
      STATUS_CODE.NOT_FOUND,
      "NOT_FOUND",
      "Professor não encontrado.",
    );
  }

  const turmaVinculada = await TurmaRepository.findOne({
    professorId,
    ativo: true,
  });
  if (turmaVinculada) {
    throw httpError(
      STATUS_CODE.CONFLICT,
      "PROFESSOR_COM_TURMA_VINCULADA",
      "Não é possível remover: professor possui turma(s) ativa(s) vinculada(s). Troque a professora da turma antes.",
    );
  }

  const usuarioVinculado = (await UsuarioRepository.findById(
    (professor as any).usuarioId,
  )) as IUsuario | null;

  if (usuarioVinculado) {
    // Tolera usuário já ausente no Cognito para não travar a limpeza do banco
    // (mesmo padrão de removeUsuario.ts).
    try {
      await removeCognitoUser(usuarioVinculado.email);
    } catch (err) {
      if ((err as { name?: string }).name !== "UserNotFoundException") {
        throw err;
      }
    }
    await UsuarioRepository.deleteOne({ _id: usuarioVinculado._id });
  }

  await ProfessorRepository.deleteOne({ _id: professorId });
};
