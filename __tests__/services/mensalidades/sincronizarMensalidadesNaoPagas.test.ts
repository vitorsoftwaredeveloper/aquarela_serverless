import { sincronizarMensalidadesNaoPagas } from "../../../src/services/mensalidades/sincronizarMensalidadesNaoPagas";
import { MensalidadeRepository } from "../../../src/repositories/mensalidade.repository";
import { PagamentoRepository } from "../../../src/repositories/pagamento.repository";

jest.mock("../../../src/libs/mongo", () => ({ db: jest.fn() }));
jest.mock("../../../src/repositories/mensalidade.repository", () => ({
  MensalidadeRepository: {
    find: jest.fn(),
    model: { updateMany: jest.fn() },
  },
}));
jest.mock("../../../src/repositories/pagamento.repository", () => ({
  PagamentoRepository: { model: { deleteMany: jest.fn() } },
}));

const financeiro = { valorMensalidade: 1, diaVencimento: 5 };

describe("sincronizarMensalidadesNaoPagas", () => {
  beforeEach(() => jest.clearAllMocks());

  it("aplica valor e vencimento novos só nas não pagas", async () => {
    (MensalidadeRepository.find as jest.Mock).mockResolvedValue([
      { _id: "m1" },
      { _id: "m2" },
    ]);

    const total = await sincronizarMensalidadesNaoPagas("crianca-1", financeiro);

    expect(total).toBe(2);

    const [filtro, pipeline, options] = (
      MensalidadeRepository.model.updateMany as jest.Mock
    ).mock.calls[0];
    expect(filtro).toEqual({ criancaId: "crianca-1", status: { $ne: "pago" } });
    expect(pipeline[0].$set.valor).toBe(1);
    expect(pipeline[0].$set.vencimento.$dateFromParts.day).toBe(5);
    expect(options).toEqual({ updatePipeline: true });
  });

  it("remove pagamentos pendentes com valor antigo, preservando os do valor novo", async () => {
    (MensalidadeRepository.find as jest.Mock).mockResolvedValue([{ _id: "m1" }]);

    await sincronizarMensalidadesNaoPagas("crianca-1", financeiro);

    expect(PagamentoRepository.model.deleteMany).toHaveBeenCalledWith({
      mensalidadeId: { $in: ["m1"] },
      status: { $ne: "pago" },
      valor: { $ne: 1 },
    });
  });

  it("devolve atrasado para aberto quando o novo vencimento é futuro", async () => {
    (MensalidadeRepository.find as jest.Mock).mockResolvedValue([{ _id: "m1" }]);

    await sincronizarMensalidadesNaoPagas("crianca-1", financeiro);

    const [, pipeline] = (MensalidadeRepository.model.updateMany as jest.Mock)
      .mock.calls[0];
    expect(pipeline[1].$set.status.$cond[0]).toEqual({
      $in: ["$status", ["aberto", "atrasado"]],
    });
  });

  it("não faz nada quando só existem mensalidades pagas", async () => {
    (MensalidadeRepository.find as jest.Mock).mockResolvedValue([]);

    expect(await sincronizarMensalidadesNaoPagas("crianca-1", financeiro)).toBe(
      0,
    );
    expect(MensalidadeRepository.model.updateMany).not.toHaveBeenCalled();
    expect(PagamentoRepository.model.deleteMany).not.toHaveBeenCalled();
  });
});
