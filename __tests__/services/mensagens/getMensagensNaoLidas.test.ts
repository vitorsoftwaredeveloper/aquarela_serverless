import { Types } from "mongoose";
import { getMensagensNaoLidasService } from "../../../src/services/mensagens/getMensagensNaoLidas";
import { CriancaRepository } from "../../../src/repositories/crianca.repository";
import { MensagemRepository } from "../../../src/repositories/mensagem.repository";
import { TurmaRepository } from "../../../src/repositories/turma.repository";
import { resolveProfessorId } from "../../../src/utils/requester";

jest.mock("../../../src/libs/mongo", () => ({ db: jest.fn() }));
jest.mock("../../../src/repositories/crianca.repository", () => ({
  CriancaRepository: { find: jest.fn() },
}));
jest.mock("../../../src/repositories/turma.repository", () => ({
  TurmaRepository: { find: jest.fn() },
}));
jest.mock("../../../src/repositories/mensagem.repository", () => ({
  MensagemRepository: { model: { aggregate: jest.fn() } },
}));
jest.mock("../../../src/utils/requester", () => ({
  resolveProfessorId: jest.fn(),
}));

const RESP_ID = "507f1f77bcf86cd799439001";
const CRIANCA_1 = "507f1f77bcf86cd799439011";
const CRIANCA_2 = "507f1f77bcf86cd799439012";
const TURMA_1 = "507f1f77bcf86cd799439021";
const PROFESSOR_DOC_1 = "507f1f77bcf86cd799439031";
const PROF_USUARIO_ID = "507f1f77bcf86cd799439041";

describe("getMensagensNaoLidasService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (MensagemRepository.model.aggregate as jest.Mock).mockResolvedValue([]);
  });

  it("responsável: escopo pelas próprias crianças (responsaveis.usuarioId ou criancasVinculadas)", async () => {
    (CriancaRepository.find as jest.Mock).mockResolvedValue([
      { _id: CRIANCA_1 },
    ]);

    const requester = {
      _id: RESP_ID,
      papel: "responsavel",
      criancasVinculadas: [CRIANCA_2],
    } as any;

    await getMensagensNaoLidasService(requester);

    expect(CriancaRepository.find).toHaveBeenCalledWith(
      {
        $or: [
          { "responsaveis.usuarioId": RESP_ID },
          { _id: { $in: [CRIANCA_2] } },
        ],
      },
      { _id: 1 },
    );
  });

  it("professor: escopo pelas crianças das turmas que leciona", async () => {
    (resolveProfessorId as jest.Mock).mockResolvedValue(PROFESSOR_DOC_1);
    (TurmaRepository.find as jest.Mock).mockResolvedValue([
      { _id: TURMA_1 },
    ]);
    (CriancaRepository.find as jest.Mock).mockResolvedValue([
      { _id: CRIANCA_1 },
    ]);

    const requester = { _id: PROF_USUARIO_ID, papel: "professor" } as any;
    await getMensagensNaoLidasService(requester);

    expect(TurmaRepository.find).toHaveBeenCalledWith(
      { professorId: PROFESSOR_DOC_1 },
      { _id: 1 },
    );
    expect(CriancaRepository.find).toHaveBeenCalledWith(
      { turmaId: { $in: [TURMA_1] } },
      { _id: 1 },
    );
  });

  it("não agrega nada quando não há crianças no escopo", async () => {
    (CriancaRepository.find as jest.Mock).mockResolvedValue([]);

    const requester = { _id: RESP_ID, papel: "responsavel" } as any;
    const resultado = await getMensagensNaoLidasService(requester);

    expect(resultado).toEqual([]);
    expect(MensagemRepository.model.aggregate).not.toHaveBeenCalled();
  });

  it("exclui as próprias mensagens e as já lidas da contagem", async () => {
    (CriancaRepository.find as jest.Mock).mockResolvedValue([
      { _id: CRIANCA_1 },
    ]);
    (MensagemRepository.model.aggregate as jest.Mock).mockResolvedValue([
      { _id: new Types.ObjectId(CRIANCA_1), naoLidas: 3 },
    ]);

    const requester = { _id: RESP_ID, papel: "responsavel" } as any;
    const resultado = await getMensagensNaoLidasService(requester);

    const [pipeline] = (MensagemRepository.model.aggregate as jest.Mock).mock
      .calls[0];
    expect(pipeline[0].$match.autorId).toEqual({
      $ne: new Types.ObjectId(RESP_ID),
    });
    expect(pipeline[0].$match["lidaPor.usuarioId"]).toEqual({
      $ne: new Types.ObjectId(RESP_ID),
    });
    expect(resultado).toEqual([{ criancaId: CRIANCA_1, naoLidas: 3 }]);
  });
});
