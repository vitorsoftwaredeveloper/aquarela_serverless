import { IAnexoReferencia } from "../anexos";
import { Role } from "../auth";

export interface ILeituraMensagem {
  usuarioId: string;
  lidaEm: Date;
}

export interface IMensagem {
  _id: string;
  criancaId: string;
  turmaId?: string;
  autorId: string;
  autorNome: string;
  autorPapel: Extract<Role, "professor" | "responsavel">;
  corpo: string;
  anexos: IAnexoReferencia[];
  lidaPor: ILeituraMensagem[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICreateMensagemPayload {
  criancaId: string;
  corpo: string;
  anexos?: IAnexoReferencia[];
}

export interface IListMensagensFilters {
  criancaId: string;
  limit?: number;
  antesDe?: string;
}

export interface IMensagemNaoLidas {
  criancaId: string;
  naoLidas: number;
}
