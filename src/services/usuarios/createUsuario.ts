import { UsuarioRepository } from "../../repositories/usuario.repository";
import { createCognitoUser, removeCognitoUser } from "../../libs/cognito";
import {
  ICreateUsuarioPayload,
  ICreateUsuarioResult,
  IUsuario,
} from "../../types/usuarios";
import {
  httpError,
  STATUS_CODE,
  DUPLICATE_KEY_ERROR_CODE,
} from "../../utils/errors";

export const createUsuarioService = async (
  payload: ICreateUsuarioPayload,
): Promise<ICreateUsuarioResult> => {
  const email = payload.email.toLowerCase();

  const existing = await UsuarioRepository.findOne({ email });
  if (existing) {
    throw httpError(
      STATUS_CODE.CONFLICT,
      "EMAIL_IN_USE",
      "Já existe um usuário com este email.",
    );
  }

  const { sub: cognitoSub, temporaryPassword } = await createCognitoUser(
    email,
    payload.papel,
  );

  try {
    const created = await UsuarioRepository.insertOne({
      cognitoSub,
      nome: payload.nome,
      email,
      papel: payload.papel,
      telefone: payload.telefone,
    });

    const usuario = (await UsuarioRepository.findById(created._id)) as IUsuario;

    // Entregue UMA vez ao admin (não é persistido nem retornado em outras rotas).
    return { ...usuario, senhaTemporaria: temporaryPassword };
  } catch (error: any) {
    await removeCognitoUser(email).catch((rollbackError) => {
      console.error("Failed to rollback Cognito user:", rollbackError);
    });

    if (error.code === DUPLICATE_KEY_ERROR_CODE) {
      throw httpError(
        STATUS_CODE.CONFLICT,
        "EMAIL_IN_USE",
        "Já existe um usuário com este email.",
      );
    }
    throw error;
  }
};
