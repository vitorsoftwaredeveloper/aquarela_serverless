import {
  AdminCreateUserCommand,
  AdminDeleteUserCommand,
  AdminDisableUserCommand,
  AdminEnableUserCommand,
  AdminSetUserPasswordCommand,
  AdminUpdateUserAttributesCommand,
  AdminAddUserToGroupCommand,
  AdminRemoveUserFromGroupCommand,
  AdminGetUserCommand,
  CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider";
import { randomUUID } from "crypto";

let cognitoClient: CognitoIdentityProviderClient | null = null;

const createCognitoClient = (): CognitoIdentityProviderClient => {
  if (!cognitoClient) {
    cognitoClient = new CognitoIdentityProviderClient({
      region: process.env.REGION,
    });
  }
  return cognitoClient;
};

/**
 * Cria o usuário no Cognito com senha definitiva (o convite/troca de senha
 * fica a cargo do fluxo "esqueci minha senha" no login), adiciona ao grupo
 * correspondente ao papel e devolve o `sub` para espelhar em `usuarios`.
 */
export const createCognitoUser = async (
  email: string,
  papel: "admin" | "professor" | "responsavel",
): Promise<string> => {
  console.log("IN - createCognitoUser");

  const cognito = createCognitoClient();
  const userPoolId = process.env.USER_POOL_ID as string;
  const temporaryPassword = `${randomUUID().slice(0, 8)}Aa1!`;

  try {
    await cognito.send(
      new AdminCreateUserCommand({
        UserPoolId: userPoolId,
        Username: email,
        TemporaryPassword: temporaryPassword,
        UserAttributes: [
          { Name: "email", Value: email },
          { Name: "email_verified", Value: "true" },
        ],
      }),
    );

    await cognito.send(
      new AdminAddUserToGroupCommand({
        UserPoolId: userPoolId,
        Username: email,
        GroupName: papel,
      }),
    );

    const user = await cognito.send(
      new AdminGetUserCommand({ UserPoolId: userPoolId, Username: email }),
    );

    const sub = user.UserAttributes?.find((attr) => attr.Name === "sub")
      ?.Value as string;

    console.log("OUT - createCognitoUser");
    return sub;
  } catch (error) {
    console.error("Error creating Cognito user:", error);
    throw error;
  }
};

export const changeCognitoUserGroup = async (
  email: string,
  papelAnterior: "admin" | "professor" | "responsavel",
  papelNovo: "admin" | "professor" | "responsavel",
): Promise<void> => {
  if (papelAnterior === papelNovo) return;

  const cognito = createCognitoClient();
  const userPoolId = process.env.USER_POOL_ID as string;

  await cognito.send(
    new AdminRemoveUserFromGroupCommand({
      UserPoolId: userPoolId,
      Username: email,
      GroupName: papelAnterior,
    }),
  );
  await cognito.send(
    new AdminAddUserToGroupCommand({
      UserPoolId: userPoolId,
      Username: email,
      GroupName: papelNovo,
    }),
  );
};

export const disableCognitoUser = async (email: string): Promise<void> => {
  const cognito = createCognitoClient();
  await cognito.send(
    new AdminDisableUserCommand({
      UserPoolId: process.env.USER_POOL_ID as string,
      Username: email,
    }),
  );
};

export const enableCognitoUser = async (email: string): Promise<void> => {
  const cognito = createCognitoClient();
  await cognito.send(
    new AdminEnableUserCommand({
      UserPoolId: process.env.USER_POOL_ID as string,
      Username: email,
    }),
  );
};

export const removeCognitoUser = async (email: string): Promise<void> => {
  const cognito = createCognitoClient();
  await cognito.send(
    new AdminDeleteUserCommand({
      UserPoolId: process.env.USER_POOL_ID as string,
      Username: email,
    }),
  );
};

export const updateCognitoUserEmail = async (
  oldEmail: string,
  newEmail: string,
): Promise<void> => {
  const cognito = createCognitoClient();
  await cognito.send(
    new AdminUpdateUserAttributesCommand({
      UserPoolId: process.env.USER_POOL_ID as string,
      Username: oldEmail,
      UserAttributes: [
        { Name: "email", Value: newEmail },
        { Name: "email_verified", Value: "true" },
      ],
    }),
  );
};
