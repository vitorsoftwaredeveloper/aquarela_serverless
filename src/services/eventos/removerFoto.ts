import { deleteObject } from "../../libs/s3";
import { EventoRepository } from "../../repositories/evento.repository";
import { IEvento } from "../../types/eventos";
import { IUsuario } from "../../types/usuarios";
import { httpError, STATUS_CODE } from "../../utils/errors";
import { assertPodeGerenciarEvento } from "../shared/eventoAccess";

export const removerFotoService = async (
  requester: IUsuario,
  eventoId: string,
  fotoKey: string,
): Promise<void> => {
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

  const existe = evento.fotos.some((foto) => foto.key === fotoKey);
  if (!existe) {
    throw httpError(
      STATUS_CODE.NOT_FOUND,
      "NOT_FOUND",
      "Foto não encontrada no evento.",
    );
  }

  await EventoRepository.updateOne(
    { _id: eventoId },
    { $pull: { fotos: { key: fotoKey } } },
  );

  await deleteObject(fotoKey);
};
