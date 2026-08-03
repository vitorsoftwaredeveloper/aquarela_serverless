const OFFSET_BRASIL_MS = 3 * 60 * 60 * 1000;

export const hojeMeiaNoiteBrasil = (): Date => {
  const localBrasil = new Date(Date.now() - OFFSET_BRASIL_MS);
  return new Date(
    Date.UTC(
      localBrasil.getUTCFullYear(),
      localBrasil.getUTCMonth(),
      localBrasil.getUTCDate(),
    ),
  );
};

export const inicioMesBrasil = (ano: number, mesUmBased: number): Date =>
  new Date(Date.UTC(ano, mesUmBased - 1, 1, 3, 0, 0));

/**
 * Meia-noite GMT-3 de um dia específico. `mesUmBased` pode passar de 12 (ou
 * ser negativo) — `Date.UTC` já normaliza o rollover de ano sozinho.
 */
export const dataBrasil = (
  ano: number,
  mesUmBased: number,
  dia: number,
): Date => new Date(Date.UTC(ano, mesUmBased - 1, dia, 3, 0, 0));

/**
 * Meia-noite GMT-3 de `dias` dias depois da data de calendário informada.
 * `Date.UTC` normaliza sozinho a virada de mês e de ano, então `dias` pode
 * ser qualquer inteiro.
 */
export const somarDiasBrasil = (data: Date, dias: number): Date =>
  new Date(
    Date.UTC(
      data.getUTCFullYear(),
      data.getUTCMonth(),
      data.getUTCDate() + dias,
      3,
      0,
      0,
    ),
  );

/** "MM-DD" a partir de uma data de calendário (UTC — sem componente de hora). */
export const diaMesDeData = (data: Date): string => {
  const mes = String(data.getUTCMonth() + 1).padStart(2, "0");
  const dia = String(data.getUTCDate()).padStart(2, "0");
  return `${mes}-${dia}`;
};
