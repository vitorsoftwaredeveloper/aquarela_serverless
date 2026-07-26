export interface IDespesa {
  _id: string;
  descricao: string;
  categoria: string;
  valor: number;
  data: Date;
  lancadoPor: string;
  anexoUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICreateDespesaPayload {
  descricao: string;
  categoria: string;
  valor: number;
  data: string;
  anexoUrl?: string;
}

export interface IUpdateDespesaPayload {
  descricao?: string;
  categoria?: string;
  valor?: number;
  data?: string;
  anexoUrl?: string;
}
