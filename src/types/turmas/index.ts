export interface ITurma {
  _id: string;
  nome: string;
  descricao?: string;
  faixaEtaria: { min: number; max: number };
  professorId: string;
  capacidade?: number;
  ativo: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICreateTurmaPayload {
  nome: string;
  descricao?: string;
  faixaEtaria: { min: number; max: number };
  professorId: string;
  capacidade?: number;
}

export interface IUpdateTurmaPayload {
  nome?: string;
  descricao?: string;
  faixaEtaria?: { min: number; max: number };
  professorId?: string;
  capacidade?: number;
}
