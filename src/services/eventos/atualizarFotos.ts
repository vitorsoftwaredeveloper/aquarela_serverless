import { EventoRepository } from "../../repositories/evento.repository";
import { IAtualizarFotosPayload, IEvento, IFotoEvento } from "../../types/eventos";
import { IUsuario } from "../../types/usuarios";
import { httpError, STATUS_CODE } from "../../utils/errors";
import { assertPodeGerenciarEvento } from "../shared/eventoAccess";
import { IEventoComFotosUrl, withFotosUrl } from "./withFotosUrl";

export const atualizarFotosService = async (
  requester: IUsuario,
  eventoId: string,
  payload: IAtualizarFotosPayload,
): Promise<IEventoComFotosUrl> => {
  const evento = (await EventoRepository.findById(
    eventoId,
  )) as IEvento | null;
  if (!evento) {
    throw httpError(
      STATUS_CODE.NOT_FOUND,
      "NOT_FOUND",
      "Evento não encontrado.",
    );
  }

  await assertPodeGerenciarEvento(requester, evento);

  const keysAtuais = new Set(evento.fotos.map((foto) => foto.key));
  const keysPayload = payload.fotos.map((foto) => foto.key);

  if (
    keysPayload.length !== keysAtuais.size ||
    !keysPayload.every((key) => keysAtuais.has(key))
  ) {
    throw httpError(
      STATUS_CODE.UNPROCESSABLE_ENTITY,
      "FOTOS_DIVERGENTES",
      "A lista de fotos precisa conter exatamente as fotos já vinculadas ao evento.",
    );
  }

  const patchPorKey = new Map(payload.fotos.map((foto) => [foto.key, foto]));
  const fotosAtualizadas: IFotoEvento[] = evento.fotos.map((foto) => {
    const patch = patchPorKey.get(foto.key)!;
    return { ...foto, legenda: patch.legenda, ordem: patch.ordem };
  });
  fotosAtualizadas.sort((a, b) => a.ordem - b.ordem);

  await EventoRepository.updateOne(
    { _id: eventoId },
    { $set: { fotos: fotosAtualizadas } },
  );

  return withFotosUrl((await EventoRepository.findById(eventoId)) as IEvento);
};
