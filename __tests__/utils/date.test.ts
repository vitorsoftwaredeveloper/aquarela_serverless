import { inicioMesBrasil } from "../../src/utils/date";

describe("inicioMesBrasil", () => {
  it("devolve o instante UTC da meia-noite em GMT-3 do mês pedido", () => {
    expect(inicioMesBrasil(2026, 7).toISOString()).toBe(
      "2026-07-01T03:00:00.000Z",
    );
  });

  it("rola o mês 13 para janeiro do ano seguinte", () => {
    expect(inicioMesBrasil(2026, 13).toISOString()).toBe(
      "2027-01-01T03:00:00.000Z",
    );
  });
});
