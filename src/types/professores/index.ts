import { IFotoUpload } from "../shared/foto";

export interface IProfessor {
  _id: string;
  usuarioId: string;
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
  formacao?: string;
  foto?: string;
  fotoUrl?: string;
  ativo: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  turmas?: { _id: string; nome: string }[];
}

export interface ICreateProfessorPayload {
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
  formacao?: string;
  foto?: IFotoUpload;
}

/** Retorno do create: professor + senha temporária entregue UMA vez ao admin. */
export interface IProfessorCriado extends IProfessor {
  senhaTemporaria: string;
}

export interface IUpdateProfessorPayload {
  nome?: string;
  telefone?: string;
  email?: string;
  formacao?: string;
  foto?: IFotoUpload;
}
