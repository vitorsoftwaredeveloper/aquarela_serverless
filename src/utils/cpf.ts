export const onlyDigits = (value: string): string => value.replace(/\D/g, "");

/**
 * Valida CPF pelo algoritmo dos dígitos verificadores (módulo 11).
 * Rejeita sequências de dígito repetido (ex.: 111.111.111-11), que passam
 * no cálculo mas nunca são CPFs válidos emitidos.
 */
export const isValidCpf = (rawCpf: string): boolean => {
  const cpf = onlyDigits(rawCpf ?? "");

  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
    return false;
  }

  const calcCheckDigit = (length: number): number => {
    let sum = 0;
    for (let i = 0; i < length; i++) {
      sum += Number(cpf[i]) * (length + 1 - i);
    }
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  return (
    calcCheckDigit(9) === Number(cpf[9]) && calcCheckDigit(10) === Number(cpf[10])
  );
};
