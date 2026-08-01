import { MensagemRepository } from "../../repositories/mensagem.repository";
import { IMensagem } from "../../types/mensagens";
import { IUsuario } from "../../types/usuarios";
import { httpError, STATUS_CODE } from "../../utils/errors";
import { removerAnexosDoBucket } from "./anexosCleanup";

export const removeMensagemService = async (
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

  if (
    requester.papel !== "admin" &&
    String(mensagem.autorId) !== String(requester._id)
  ) {
    throw httpError(
      STATUS_CODE.FORBIDDEN,
      "FORBIDDEN",
      "Apenas o autor ou a administração podem remover esta mensagem.",
    );
  }

  await MensagemRepository.deleteOne({ _id: mensagemId });
  await removerAnexosDoBucket(mensagem.anexos);
};
