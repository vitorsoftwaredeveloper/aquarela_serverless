export interface IResponsavel {
  usuarioId?: string;
  nome: string;
  cpf: string;
  parentesco: string;
  telefone: string;
  email: string;
  podeRetirar: boolean;
}

export interface IMedicacaoContinua {
  nome: string;
  dose: string;
  horario: string;
  observacao?: string;
}

export interface ISaude {
  alergias?: string[];
  restricoesAlimentares?: string[];
  medicacoesContinuas?: IMedicacaoContinua[];
  condicoesAtipicas?: string[];
  cuidadosEspeciais?: string;
  observacoes?: string;
}

export interface IFinanceiroCrianca {
  planoId?: string;
  valorMensalidade: number;
  diaVencimento: number;
}

export interface IAuditoriaEntry {
  usuarioId: string;
  alteradoEm: Date;
  campos: string[];
}

export interface ICrianca {
  _id: string;
  nome: string;
  dataNascimento: Date;
  cpf: string;
  foto?: string;
  turmaId?: string | null;
  responsaveis: IResponsavel[];
  saude: ISaude;
  financeiro: IFinanceiroCrianca;
  auditoria?: IAuditoriaEntry[];
  ativo: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICreateCriancaPayload {
  nome: string;
  dataNascimento: string;
  cpf: string;
  foto?: string;
  turmaId?: string;
  responsaveis: IResponsavel[];
  saude?: ISaude;
  financeiro: IFinanceiroCrianca;
}

export interface IUpdateCriancaPayload {
  nome?: string;
  dataNascimento?: string;
  foto?: string;
  responsaveis?: IResponsavel[];
  saude?: ISaude;
  financeiro?: IFinanceiroCrianca;
}
