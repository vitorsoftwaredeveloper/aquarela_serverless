export interface INotificacaoPayload {
  titulo: string;
  corpo: string;
  link?: string;
  dados?: Record<string, string>;
}

export interface IResultadoEnvioToken {
  token: string;
  sucesso: boolean;
  tokenInvalido?: boolean;
  erro?: string;
}
