export type Refeicao = "cafe" | "almoco" | "lanche" | "janta";
export type Aceitacao = "tudo" | "parte" | "recusou";
export type Humor = "feliz" | "tranquilo" | "neutro" | "choroso";
export type TipoIntercorrencia = "febre" | "queda" | "doenca" | "outro";

export interface IAlimentacaoItem {
  refeicao: Refeicao;
  aceitacao: Aceitacao;
  obs?: string;
}

export interface ISonoItem {
  inicio: string;
  fim: string;
}

export interface IHigiene {
  fraldas?: number;
  obs?: string;
}

export interface IMedicacaoAdministrada {
  nome: string;
  dose: string;
  hora: string;
  aplicadaPor: string;
}

export interface IIntercorrencia {
  tipo: TipoIntercorrencia;
  descricao: string;
  hora: string;
  notificado?: boolean;
}

export interface IAgendaDiaria {
  _id: string;
  criancaId: string;
  turmaId: string;
  data: Date;
  registradoPor: string;
  alimentacao: IAlimentacaoItem[];
  sono: ISonoItem[];
  atividades: string[];
  humor?: Humor;
  higiene?: IHigiene;
  medicacoesAdministradas: IMedicacaoAdministrada[];
  intercorrencias: IIntercorrencia[];
  observacoes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICreateAgendaPayload {
  criancaId: string;
  data: string;
  alimentacao?: IAlimentacaoItem[];
  sono?: ISonoItem[];
  atividades?: string[];
  humor?: Humor;
  higiene?: IHigiene;
  medicacoesAdministradas?: IMedicacaoAdministrada[];
  intercorrencias?: IIntercorrencia[];
  observacoes?: string;
}

export interface IUpdateAgendaPayload {
  alimentacao?: IAlimentacaoItem[];
  sono?: ISonoItem[];
  atividades?: string[];
  humor?: Humor;
  higiene?: IHigiene;
  medicacoesAdministradas?: IMedicacaoAdministrada[];
  intercorrencias?: IIntercorrencia[];
  observacoes?: string;
}
