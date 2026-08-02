import { db } from "../../libs/mongo";
import { ProfessorRepository } from "../../repositories/professor.repository";
import { TurmaRepository } from "../../repositories/turma.repository";
import { UsuarioRepository } from "../../repositories/usuario.repository";
import { removeCognitoUser } from "../../libs/cognito";
import { IUsuario } from "../../types/usuarios";
import { httpError, STATUS_CODE } from "../../utils/errors";
import { removerFotoDoBucket } from "../shared/fotoProfessor";

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

  const turmasVinculadas = await TurmaRepository.find({
    professorIds: professorId,
  });
  const turmaOndeEhUnico = turmasVinculadas.find(
    (turma: any) => turma.professorIds.length === 1,
  );
  if (turmaOndeEhUnico) {
    throw httpError(
      STATUS_CODE.CONFLICT,
      "PROFESSOR_COM_TURMA_VINCULADA",
      "Não é possível remover: professor é o único responsável por uma turma. Adicione outro professor antes.",
    );
  }
  if (turmasVinculadas.length > 0) {
    await db();
    await TurmaRepository.model.updateMany(
      { professorIds: professorId },
      { $pull: { professorIds: professorId } },
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

  await removerFotoDoBucket((professor as any).foto);
};
