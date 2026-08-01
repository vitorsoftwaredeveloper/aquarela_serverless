import { removeCriancaService } from "../../../src/services/criancas/removeCrianca";
import { CriancaRepository } from "../../../src/repositories/crianca.repository";
import { AgendaRepository } from "../../../src/repositories/agenda.repository";
import { MensagemRepository } from "../../../src/repositories/mensagem.repository";
import { MensalidadeRepository } from "../../../src/repositories/mensalidade.repository";
import { PagamentoRepository } from "../../../src/repositories/pagamento.repository";
import { UsuarioRepository } from "../../../src/repositories/usuario.repository";
import { removeUsuarioService } from "../../../src/services/usuarios/removeUsuario";
import { removerAnexosDoBucket } from "../../../src/services/mensagens/anexosCleanup";
import { removerFotoDoBucket } from "../../../src/services/shared/fotoCrianca";

jest.mock("../../../src/libs/mongo", () => ({ db: jest.fn() }));
jest.mock("../../../src/repositories/crianca.repository", () => ({
  CriancaRepository: {
    findById: jest.fn(),
    deleteOne: jest.fn(),
    count: jest.fn(),
  },
}));
jest.mock("../../../src/repositories/agenda.repository", () => ({
  AgendaRepository: { model: { deleteMany: jest.fn() } },
}));
jest.mock("../../../src/repositories/mensagem.repository", () => ({
  MensagemRepository: { find: jest.fn(), model: { deleteMany: jest.fn() } },
}));
jest.mock("../../../src/repositories/mensalidade.repository", () => ({
  MensalidadeRepository: { model: { deleteMany: jest.fn() } },
}));
jest.mock("../../../src/repositories/pagamento.repository", () => ({
  PagamentoRepository: { model: { deleteMany: jest.fn() } },
}));
jest.mock("../../../src/repositories/usuario.repository", () => ({
  UsuarioRepository: {
    model: { updateMany: jest.fn() },
    findById: jest.fn(),
  },
}));
jest.mock("../../../src/services/usuarios/removeUsuario", () => ({
  removeUsuarioService: jest.fn(),
}));
jest.mock("../../../src/services/mensagens/anexosCleanup", () => ({
  removerAnexosDoBucket: jest.fn(),
}));
jest.mock("../../../src/services/shared/fotoCrianca", () => ({
  removerFotoDoBucket: jest.fn(),
}));

const crianca = {
  _id: "crianca-1",
  foto: "criancas/crianca-1/a.jpg",
  responsaveis: [],
};

describe("removeCriancaService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (CriancaRepository.findById as jest.Mock).mockResolvedValue(crianca);
    (MensagemRepository.find as jest.Mock).mockResolvedValue([]);
    (CriancaRepository.count as jest.Mock).mockResolvedValue(0);
  });

  it("lança 404 quando a criança não existe", async () => {
    (CriancaRepository.findById as jest.Mock).mockResolvedValue(null);

    await expect(removeCriancaService("crianca-1")).rejects.toMatchObject({
      statusCode: 404,
      code: "NOT_FOUND",
    });
    expect(MensagemRepository.model.deleteMany).not.toHaveBeenCalled();
  });

  it("apaga em cadeia agenda, mensalidades, pagamentos e mensagens da criança", async () => {
    await removeCriancaService("crianca-1");

    expect(AgendaRepository.model.deleteMany).toHaveBeenCalledWith({
      criancaId: "crianca-1",
    });
    expect(MensalidadeRepository.model.deleteMany).toHaveBeenCalledWith({
      criancaId: "crianca-1",
    });
    expect(PagamentoRepository.model.deleteMany).toHaveBeenCalledWith({
      criancaId: "crianca-1",
    });
    expect(MensagemRepository.model.deleteMany).toHaveBeenCalledWith({
      criancaId: "crianca-1",
    });
    expect(CriancaRepository.deleteOne).toHaveBeenCalledWith({
      _id: "crianca-1",
    });
  });

  it("remove do bucket a foto da criança e os anexos de cada mensagem dela", async () => {
    const mensagens = [
      { _id: "msg-1", anexos: [{ key: "mensagens/a.pdf" }] },
      { _id: "msg-2", anexos: [{ key: "mensagens/b.png" }] },
    ];
    (MensagemRepository.find as jest.Mock).mockResolvedValue(mensagens);

    await removeCriancaService("crianca-1");

    expect(removerFotoDoBucket).toHaveBeenCalledWith(crianca.foto);
    expect(removerAnexosDoBucket).toHaveBeenCalledTimes(2);
    expect(removerAnexosDoBucket).toHaveBeenCalledWith(mensagens[0].anexos);
    expect(removerAnexosDoBucket).toHaveBeenCalledWith(mensagens[1].anexos);
  });

  it("busca as mensagens antes de apagá-las, para não perder os anexos a limpar", async () => {
    const chamadas: string[] = [];
    (MensagemRepository.find as jest.Mock).mockImplementation(async () => {
      chamadas.push("find");
      return [];
    });
    (MensagemRepository.model.deleteMany as jest.Mock).mockImplementation(
      async () => {
        chamadas.push("deleteMany");
      },
    );

    await removeCriancaService("crianca-1");

    expect(chamadas.indexOf("find")).toBeLessThan(
      chamadas.indexOf("deleteMany"),
    );
  });
});
