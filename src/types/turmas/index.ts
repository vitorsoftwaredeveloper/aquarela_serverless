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
  /** Só populado em `GET /turmas` (ver listTurmas service). */
  professor?: { _id: string; nome: string; email: string } | null;
  /** Só populado em `GET /turmas` para o professor (ver listTurmas service). */
  totalCriancas?: number;
  agendasPendentes?: number;
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
