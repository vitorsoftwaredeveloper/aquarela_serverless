export interface IRelatorioAnualMes {
  mes: number;
  pagamentos: number;
  despesas: number;
  saldo: number;
  quantidadePagamentos: number;
}

export interface IRelatorioAnualCriancaMes {
  mes: number;
  valor: number;
  quantidadePagamentos: number;
}

export interface IRelatorioAnualCrianca {
  criancaId: string;
  nome: string;
  turmaNome?: string | null;
  total: number;
  meses: IRelatorioAnualCriancaMes[];
}

export interface IRelatorioAnualTotais {
  pagamentos: number;
  despesas: number;
  saldo: number;
  quantidadePagamentos: number;
  criancasComPagamento: number;
  ticketMedio: number;
}

export interface IRelatorioAnual {
  _id: string;
  ano: number;
  consolidadoEm: Date;
  totais: IRelatorioAnualTotais;
  meses: IRelatorioAnualMes[];
  criancas: IRelatorioAnualCrianca[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IRelatorioAnualResponse
  extends Omit<IRelatorioAnual, "_id" | "createdAt" | "updatedAt"> {
  origem: "consolidado" | "calculado";
  anosDisponiveis: number[];
}
