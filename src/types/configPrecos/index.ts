export interface IDesconto {
  meses: number;
  percentual: number;
}

export type TipoPlano = "integral" | "meioPeriodo";

export interface IPlano {
  nome: string;
  tipo: TipoPlano;
  valorMensal: number;
  valorDiario?: number;
  descontos?: IDesconto[];
}

export interface IConfigPrecos {
  _id: string;
  planos: IPlano[];
  atualizadoPor?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IUpdateConfigPrecosPayload {
  planos: IPlano[];
}
