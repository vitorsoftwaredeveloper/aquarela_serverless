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
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
  formacao?: string;
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
}
