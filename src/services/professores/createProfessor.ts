import mongoose, { Types } from "mongoose";
import { db } from "../../libs/mongo";
import { ProfessorRepository } from "../../repositories/professor.repository";
import { UsuarioRepository } from "../../repositories/usuario.repository";
import { createCognitoUser, removeCognitoUser } from "../../libs/cognito";
import {
  ICreateProfessorPayload,
  IProfessorCriado,
} from "../../types/professores";
import { isValidCpf } from "../../utils/cpf";
import {
  httpError,
  STATUS_CODE,
  DUPLICATE_KEY_ERROR_CODE,
} from "../../utils/errors";
import {
  gravarFoto,
  removerFotoDoBucket,
  validarFotoBase64,
  withFotoUrl,
} from "../shared/fotoProfessor";

/**
 * Cria usuário (Cognito + `usuarios`) e professor juntos. Usuário e professor
 * são gravados em uma transação (replicaSet); se qualquer etapa falhar depois
 * do Cognito já ter criado a conta, o usuário do Cognito é removido (rollback
 * manual, já que Cognito não participa da transação do Mongo).
 */
export const createProfessorService = async (
  payload: ICreateProfessorPayload,
): Promise<IProfessorCriado> => {
  if (!isValidCpf(payload.cpf)) {
    throw httpError(STATUS_CODE.BAD_REQUEST, "INVALID_CPF", "CPF inválido.");
  }

  const email = payload.email.toLowerCase();

  const existing = await UsuarioRepository.findOne({ email });
  if (existing) {
    throw httpError(
      STATUS_CODE.CONFLICT,
      "EMAIL_IN_USE",
      "Já existe um usuário com este email.",
    );
  }

  // Valida a foto ANTES de criar o usuário no Cognito — evita provisionar uma
  // conta que seria descartada em seguida por um upload inválido.
  const fotoBytes = payload.foto ? validarFotoBase64(payload.foto) : undefined;

  const { sub: cognitoSub, temporaryPassword } = await createCognitoUser(
    email,
    "professor",
  );

  const professorId = new Types.ObjectId();
  const fotoKey =
    fotoBytes && payload.foto
      ? await gravarFoto(String(professorId), fotoBytes, payload.foto.contentType)
      : undefined;

  try {
    await db();
    const session = await mongoose.startSession();

    let professor;
    try {
      await session.withTransaction(async () => {
        const usuario = await UsuarioRepository.insertOne(
          {
            cognitoSub,
            nome: payload.nome,
            email,
            papel: "professor",
            telefone: payload.telefone,
          },
          { session },
        );

        professor = await ProfessorRepository.insertOne(
          {
            _id: professorId,
            usuarioId: usuario._id,
            nome: payload.nome,
            cpf: payload.cpf,
            telefone: payload.telefone,
            email,
            formacao: payload.formacao,
            foto: fotoKey,
          },
          { session },
        );
      });
    } finally {
      await session.endSession();
    }

    return {
      ...(await withFotoUrl((professor as any).toObject())),
      senhaTemporaria: temporaryPassword,
    };
  } catch (error: any) {
    await removerFotoDoBucket(fotoKey);
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
