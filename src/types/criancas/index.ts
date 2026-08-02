import { IFotoUpload, TipoImagemFoto } from "../shared/foto";

export { IFotoUpload, TipoImagemFoto };

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

export interface IConsentimentoLgpd {
  aceito: boolean;
  aceitoEm: Date;
}

export interface ICrianca {
  _id: string;
  nome: string;
  dataNascimento: Date;
  /** Derivado ("MM-DD") — indexado para o cron de aniversário. */
  nascimentoDiaMes: string;
  ultimoAniversarioNotificadoEm?: Date | null;
  cpf: string;
  foto?: string;
  fotoUrl?: string;
  turmaId?: string | null;
  turmaNome?: string | null;
  responsaveis: IResponsavel[];
  saude: ISaude;
  financeiro: IFinanceiroCrianca;
  consentimentoLgpd: IConsentimentoLgpd;
  auditoria?: IAuditoriaEntry[];
  createdAt?: Date;
  updatedAt?: Date;
  agendaRegistradaHoje?: boolean;
  agendaEnviadaHoje?: boolean;
}

export interface ICreateCriancaPayload {
  nome: string;
  dataNascimento: string;
  cpf: string;
  foto?: IFotoUpload;
  turmaId?: string;
  responsaveis: IResponsavel[];
  saude?: ISaude;
  financeiro: IFinanceiroCrianca;
  consentimentoLgpd: boolean;
}

/** Acesso de responsável criado junto com a criança (senha entregue 1x ao admin). */
export interface IAcessoResponsavelCriado {
  nome: string;
  email: string;
  senhaTemporaria: string;
}

/** Retorno do create: a criança + acessos de responsável recém-criados. */
export interface ICreateCriancaResult {
  crianca: ICrianca;
  acessosResponsaveis: IAcessoResponsavelCriado[];
}

export interface IUpdateCriancaPayload {
  nome?: string;
  dataNascimento?: string;
  foto?: IFotoUpload;
  responsaveis?: IResponsavel[];
  saude?: ISaude;
  financeiro?: IFinanceiroCrianca;
}
