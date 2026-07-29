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
