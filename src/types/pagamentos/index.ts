export type StatusPagamento = "pendente" | "pago" | "expirado" | "falhou";
export type MetodoPagamento = "pix" | "dinheiro";
export type ProvedorPagamento = "mercadopago" | "manual";

export interface IPagamento {
  _id: string;
  mensalidadeId: string;
  criancaId: string;
  metodo: MetodoPagamento;
  provedor: ProvedorPagamento;
  txid: string;
  providerPaymentId?: string;
  valor: number;
  status: StatusPagamento;
  pixCopiaECola?: string;
  qrBase64?: string;
  reciboUrl?: string;
  recebidoPor?: string;
  pagoEm?: Date;
  tentativasReconciliacao?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICreatePagamentoPayload {
  mensalidadeId: string;
}

export interface ICreatePagamentoManualPayload {
  mensalidadeId: string;
  valor: number;
}
