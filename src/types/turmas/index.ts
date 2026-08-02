export interface ITurma {
  _id: string;
  nome: string;
  descricao?: string;
  faixaEtaria: { min: number; max: number };
  professorIds: string[];
  capacidade?: number;
  createdAt?: Date;
  updatedAt?: Date;
  /** Derivado de `professorIds[0]` — compat de 1 release, remover depois. */
  professorId?: string;
  /** Só populado em `GET /turmas` (ver listTurmas service). */
  professores?: { _id: string; nome: string; email: string }[];
  /** Derivado de `professores[0]` — compat de 1 release, remover depois. */
  professor?: { _id: string; nome: string; email: string } | null;
  /** Só populado em `GET /turmas` para o professor (ver listTurmas service). */
  totalCriancas?: number;
  agendasPendentes?: number;
}

export interface ICreateTurmaPayload {
  nome: string;
  descricao?: string;
  faixaEtaria: { min: number; max: number };
  professorIds: string[];
  capacidade?: number;
}

export interface IUpdateTurmaPayload {
  nome?: string;
  descricao?: string;
  faixaEtaria?: { min: number; max: number };
  professorIds?: string[];
  capacidade?: number;
}
