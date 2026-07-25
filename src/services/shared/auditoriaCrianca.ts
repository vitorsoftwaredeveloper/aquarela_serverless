import { IAuditoriaEntry, ICrianca } from "../../types/criancas";

/** Trilha embutida capada (CAD-09) — ver comentário em `models/Crianca.ts`. */
export const AUDITORIA_MAX_ENTRIES = 50;

export const appendAuditoria = (
  crianca: Pick<ICrianca, "auditoria">,
  usuarioId: string,
  campos: string[],
): IAuditoriaEntry[] =>
  [
    ...(crianca.auditoria ?? []),
    { usuarioId, alteradoEm: new Date(), campos },
  ].slice(-AUDITORIA_MAX_ENTRIES);
