export interface IAviso {
  _id: string;
  titulo: string;
  corpo: string;
  autorId: string;
  turmaId?: string;
  ativo: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICreateAvisoPayload {
  titulo: string;
  corpo: string;
  turmaId?: string;
}

export interface IUpdateAvisoPayload {
  titulo?: string;
  corpo?: string;
  turmaId?: string;
}
