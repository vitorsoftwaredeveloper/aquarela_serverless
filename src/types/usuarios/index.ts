import { Role } from "../auth";

export interface IUsuario {
  _id: string;
  cognitoSub: string;
  nome: string;
  email: string;
  papel: Role;
  telefone?: string;
  professorId?: string;
  criancasVinculadas?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICreateUsuarioPayload {
  nome: string;
  email: string;
  papel: Role;
  telefone?: string;
}

/** Retorno do create: usuário + senha temporária entregue UMA vez ao admin. */
export interface ICreateUsuarioResult extends IUsuario {
  senhaTemporaria: string;
}

export interface IUpdateUsuarioPayload {
  nome?: string;
  telefone?: string;
  papel?: Role;
}

export interface IRedefinirSenhaPayload {
  novaSenha: string;
}
