export type StatusMensalidade = "aberto" | "pago" | "atrasado" | "cancelado";

export type GatilhoCobranca = "dia05" | "dia20" | "manual";

export interface ICobranca {
  enviadaEm: Date;
  canal: "push";
  gatilho: GatilhoCobranca;
}

export interface IMensalidade {
  _id: string;
  criancaId: string;
  ano: number;
  mes: number;
  valor: number;
  vencimento: Date;
  status: StatusMensalidade;
  pagamentoId?: string;
  inadimplenteDesde?: Date;
  cobrancas?: ICobranca[];
  createdAt?: Date;
  updatedAt?: Date;
}
