export interface IProfessor {
  _id: string;
  usuarioId: string;
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
  formacao?: string;
  ativo: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICreateProfessorPayload {
  usuarioId: string;
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
  formacao?: string;
}

export interface IUpdateProfessorPayload {
  nome?: string;
  telefone?: string;
  email?: string;
  formacao?: string;
}
