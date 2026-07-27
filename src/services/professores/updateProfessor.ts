import { ProfessorRepository } from "../../repositories/professor.repository";
import { UsuarioRepository } from "../../repositories/usuario.repository";
import { updateCognitoUserEmail } from "../../libs/cognito";
import { IProfessor, IUpdateProfessorPayload } from "../../types/professores";
import { IUsuario } from "../../types/usuarios";
import { httpError, STATUS_CODE } from "../../utils/errors";
import { assertPodeEditarProfessor } from "../shared/professorAccess";

export const updateProfessorService = async (
  requester: IUsuario,
  professorId: string,
  payload: IUpdateProfessorPayload,
): Promise<IProfessor> => {
  const professor = (await ProfessorRepository.findById(
    professorId,
  )) as IProfessor | null;
  if (!professor) {
    throw httpError(
      STATUS_CODE.NOT_FOUND,
      "NOT_FOUND",
      "Professor não encontrado.",
    );
  }

  assertPodeEditarProfessor(requester, professor, payload);

  const novoEmail = payload.email?.toLowerCase();
  const emailMudou = !!novoEmail && novoEmail !== professor.email;

  if (emailMudou) {
    const emailEmUso = await UsuarioRepository.findOne({ email: novoEmail });
    if (emailEmUso) {
      throw httpError(
        STATUS_CODE.CONFLICT,
        "EMAIL_IN_USE",
        "Já existe um usuário com este email.",
      );
    }

    // Cognito usa o email como username: atualiza lá e em `usuarios` antes de
    // gravar em `professores`, senão login e cadastro ficam divergentes.
    await updateCognitoUserEmail(professor.email, novoEmail);
    await UsuarioRepository.updateOne(
      { _id: professor.usuarioId },
      { $set: { email: novoEmail } },
    );
  }

  const update = {
    ...payload,
    ...(novoEmail && { email: novoEmail }),
  };

  await ProfessorRepository.updateOne({ _id: professorId }, { $set: update });

  return (await ProfessorRepository.findById(professorId)) as IProfessor;
};
