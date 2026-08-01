import { MensagemRepository } from "../../repositories/mensagem.repository";
import { IMensagem } from "../../types/mensagens";
import { IUsuario } from "../../types/usuarios";
import { httpError, STATUS_CODE } from "../../utils/errors";
import { loadCriancaParaMensagem } from "../shared/mensagemAccess";

export const marcarMensagemLidaService = async (
  requester: IUsuario,
  mensagemId: string,
): Promise<void> => {
  const mensagem = (await MensagemRepository.findById(
    mensagemId,
  )) as IMensagem | null;

  if (!mensagem) {
    throw httpError(
      STATUS_CODE.NOT_FOUND,
      "NOT_FOUND",
      "Mensagem não encontrada.",
    );
  }

  await loadCriancaParaMensagem(requester, mensagem.criancaId);

  await MensagemRepository.updateOne(
    { _id: mensagemId, "lidaPor.usuarioId": { $ne: requester._id } },
    { $push: { lidaPor: { usuarioId: requester._id, lidaEm: new Date() } } },
  );
};
