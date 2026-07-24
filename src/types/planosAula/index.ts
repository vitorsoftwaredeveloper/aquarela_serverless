export interface IPlanoAula {
  _id: string;
  turmaId: string;
  professorId: string;
  titulo: string;
  descricao: string;
  data: Date;
  objetivos?: string[];
  materiais?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICreatePlanoAulaPayload {
  turmaId: string;
  titulo: string;
  descricao: string;
  data: string;
  objetivos?: string[];
  materiais?: string[];
}

export interface IUpdatePlanoAulaPayload {
  turmaId?: string;
  titulo?: string;
  descricao?: string;
  data?: string;
  objetivos?: string[];
  materiais?: string[];
}
