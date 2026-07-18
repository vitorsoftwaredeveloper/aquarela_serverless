export type StatusPagamento = "pendente" | "pago" | "expirado" | "falhou";

export interface IPagamento {
  _id: string;
  mensalidadeId: string;
  criancaId: string;
  metodo: "pix";
  provedor: "mercadopago";
  txid: string;
  providerPaymentId?: string;
  valor: number;
  status: StatusPagamento;
  pixCopiaECola?: string;
  qrBase64?: string;
  reciboUrl?: string;
  pagoEm?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICreatePagamentoPayload {
  mensalidadeId: string;
}
