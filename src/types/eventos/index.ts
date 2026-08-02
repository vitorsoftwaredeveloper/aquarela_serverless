import { IAnexoReferencia } from "../anexos";

export interface IFotoEvento extends IAnexoReferencia {
  legenda?: string;
  ordem: number;
  enviadoPor: string;
  enviadoEm: Date;
}

export interface IEvento {
  _id: string;
  titulo: string;
  descricao?: string;
  data: Date;
  turmaId?: string;
  autorId: string;
  fotos: IFotoEvento[];
  publicado: boolean;
  publicadoEm?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICreateEventoPayload {
  titulo: string;
  descricao?: string;
  data: string;
  turmaId?: string;
}

export interface IUpdateEventoPayload {
  titulo?: string;
  descricao?: string;
  data?: string;
  turmaId?: string;
}

export interface IFotoDeclarada {
  key: string;
  nome: string;
  contentType: string;
  tamanho: number;
  legenda?: string;
}

export interface IAdicionarFotosPayload {
  fotos: IFotoDeclarada[];
}

export interface IFotoAtualizacao {
  key: string;
  legenda?: string;
  ordem: number;
}

export interface IAtualizarFotosPayload {
  fotos: IFotoAtualizacao[];
}

export interface IListEventosFilters {
  turmaId?: string;
  ano?: number;
}
