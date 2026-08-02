import { EventoRepository } from "../../repositories/evento.repository";
import { IEvento } from "../../types/eventos";
import { IUsuario } from "../../types/usuarios";
import { httpError, STATUS_CODE } from "../../utils/errors";
import { assertPodeGerenciarEvento } from "../shared/eventoAccess";
import { removerFotosDoBucket } from "./fotosCleanup";

export const removeEventoService = async (
  requester: IUsuario,
  eventoId: string,
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

  await EventoRepository.deleteOne({ _id: eventoId });
  await removerFotosDoBucket(evento.fotos);
};
