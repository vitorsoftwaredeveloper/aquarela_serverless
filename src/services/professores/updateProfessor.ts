import { ProfessorRepository } from "../../repositories/professor.repository";
import { UsuarioRepository } from "../../repositories/usuario.repository";
import { updateCognitoUserEmail } from "../../libs/cognito";
import { IProfessor, IUpdateProfessorPayload } from "../../types/professores";
import { IUsuario } from "../../types/usuarios";
import { httpError, STATUS_CODE } from "../../utils/errors";
import { assertPodeEditarProfessor } from "../shared/professorAccess";
import {
  removerFotoDoBucket,
  salvarFotoBase64,
  withFotoUrl,
} from "../shared/fotoProfessor";

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

  const { foto, ...camposDiretos } = payload;
  const update: Record<string, unknown> = {
    ...camposDiretos,
    ...(novoEmail && { email: novoEmail }),
  };

  // Grava a imagem antes do update: se o S3 falhar, o cadastro fica intacto.
  const fotoAnterior = professor.foto;
  if (foto) {
    update.foto = await salvarFotoBase64(professorId, foto);
  }

  await ProfessorRepository.updateOne({ _id: professorId }, { $set: update });

  // Só depois da troca gravada, para não perder a foto antiga se o update falhar.
  if (foto && fotoAnterior && fotoAnterior !== update.foto) {
    await removerFotoDoBucket(fotoAnterior);
  }

  return withFotoUrl(
    (await ProfessorRepository.findById(professorId)) as IProfessor,
  ) as Promise<IProfessor>;
};
