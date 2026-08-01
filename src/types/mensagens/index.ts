import { IAnexoReferencia } from "../anexos";
import { Role } from "../auth";

export interface IMensagem {
  _id: string;
  criancaId: string;
  turmaId?: string;
  autorId: string;
  autorNome: string;
  autorPapel: Extract<Role, "professor" | "responsavel">;
  corpo: string;
  anexos: IAnexoReferencia[];
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
  desde?: string;
}
