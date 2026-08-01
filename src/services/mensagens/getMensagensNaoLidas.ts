import { Types } from "mongoose";
import { CriancaRepository } from "../../repositories/crianca.repository";
import { MensagemRepository } from "../../repositories/mensagem.repository";
import { TurmaRepository } from "../../repositories/turma.repository";
import { IMensagemNaoLidas } from "../../types/mensagens";
import { IUsuario } from "../../types/usuarios";
import { resolveProfessorId } from "../../utils/requester";

const resolveCriancaIdsVisiveis = async (
  requester: IUsuario,
): Promise<string[]> => {
  if (requester.papel === "professor") {
    const professorId = await resolveProfessorId(requester);
    const turmas = await TurmaRepository.find({ professorId }, { _id: 1 });
    const turmaIds = turmas.map((turma: any) => String(turma._id));
    const criancas = await CriancaRepository.find(
      { turmaId: { $in: turmaIds } },
      { _id: 1 },
    );
    return criancas.map((crianca: any) => String(crianca._id));
  }

  const criancas = await CriancaRepository.find(
    {
      $or: [
        { "responsaveis.usuarioId": requester._id },
        { _id: { $in: requester.criancasVinculadas ?? [] } },
      ],
    },
    { _id: 1 },
  );
  return criancas.map((crianca: any) => String(crianca._id));
};

export const getMensagensNaoLidasService = async (
  requester: IUsuario,
): Promise<IMensagemNaoLidas[]> => {
  const criancaIds = await resolveCriancaIdsVisiveis(requester);
  if (criancaIds.length === 0) return [];

  const resultado = await MensagemRepository.model.aggregate([
    {
      $match: {
        criancaId: { $in: criancaIds.map((id) => new Types.ObjectId(id)) },
        autorId: { $ne: new Types.ObjectId(requester._id) },
        "lidaPor.usuarioId": { $ne: new Types.ObjectId(requester._id) },
      },
    },
    { $group: { _id: "$criancaId", naoLidas: { $sum: 1 } } },
  ]);

  return resultado.map((item) => ({
    criancaId: String(item._id),
    naoLidas: item.naoLidas,
  }));
};
