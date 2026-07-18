export type StatusMensalidade = "aberto" | "pago" | "atrasado" | "cancelado";

export interface IMensalidade {
  _id: string;
  criancaId: string;
  ano: number;
  mes: number;
  valor: number;
  vencimento: Date;
  status: StatusMensalidade;
  pagamentoId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
