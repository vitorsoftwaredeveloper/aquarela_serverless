import { isValidCpf } from "../../src/utils/cpf";

describe("isValidCpf", () => {
  it("aceita um CPF válido (com e sem máscara)", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCpf("52998224725")).toBe(true);
  });

  it("rejeita CPF com dígito verificador incorreto", () => {
    expect(isValidCpf("529.982.247-26")).toBe(false);
  });

  it("rejeita sequências de dígito repetido", () => {
    expect(isValidCpf("111.111.111-11")).toBe(false);
    expect(isValidCpf("00000000000")).toBe(false);
  });

  it("rejeita valores com tamanho incorreto", () => {
    expect(isValidCpf("123")).toBe(false);
    expect(isValidCpf("")).toBe(false);
  });
});
