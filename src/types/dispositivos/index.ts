export type PlataformaDispositivo = "android" | "ios" | "web" | "desktop";

export interface IDispositivo {
  _id: string;
  usuarioId: string;
  token: string;
  plataforma: PlataformaDispositivo;
  instalado: boolean;
  ultimoUsoEm: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IRegistrarDispositivoPayload {
  token: string;
  plataforma: PlataformaDispositivo;
  instalado?: boolean;
}
