import { limparAnexosOrfaosService } from "../../../src/services/anexos/limparAnexosOrfaos";
import { deleteObject, listObjectsByPrefix } from "../../../src/libs/s3";

jest.mock("../../../src/libs/s3");

const horasAtras = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000);

describe("limparAnexosOrfaos", () => {
  beforeEach(() => {
    (listObjectsByPrefix as jest.Mock).mockResolvedValue([]);
  });

  it("apaga objetos com mais de 24h e mantém os recentes", async () => {
    (listObjectsByPrefix as jest.Mock).mockImplementation(
      async (prefix: string) => {
        if (prefix === "mensagens/") {
          return [
            { key: "mensagens/velho.pdf", lastModified: horasAtras(48) },
            { key: "mensagens/novo.pdf", lastModified: horasAtras(1) },
          ];
        }
        return [];
      },
    );

    const resultado = await limparAnexosOrfaosService();

    expect(resultado).toEqual({ removidos: 1 });
    expect(deleteObject).toHaveBeenCalledTimes(1);
    expect(deleteObject).toHaveBeenCalledWith("mensagens/velho.pdf");
  });

  it("varre os três prefixos de escopo", async () => {
    await limparAnexosOrfaosService();

    expect(listObjectsByPrefix).toHaveBeenCalledWith("mensagens/");
    expect(listObjectsByPrefix).toHaveBeenCalledWith("agendas/");
    expect(listObjectsByPrefix).toHaveBeenCalledWith("eventos/");
  });

  it("não apaga nada quando não há objetos", async () => {
    const resultado = await limparAnexosOrfaosService();

    expect(resultado).toEqual({ removidos: 0 });
    expect(deleteObject).not.toHaveBeenCalled();
  });
});
