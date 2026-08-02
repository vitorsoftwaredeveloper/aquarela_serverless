import { EventoRepository } from "../../repositories/evento.repository";
import { IAdicionarFotosPayload, IEvento, IFotoEvento } from "../../types/eventos";
import { IUsuario } from "../../types/usuarios";
import { httpError, STATUS_CODE } from "../../utils/errors";
import { assertPodeGerenciarEvento } from "../shared/eventoAccess";
import { validarAnexosVinculados } from "../anexos/validarAnexoVinculado";
import { MAX_FOTOS_POR_EVENTO } from "./eventoConstantes";
import { IEventoComFotosUrl, withFotosUrl } from "./withFotosUrl";

export const adicionarFotosService = async (
  requester: IUsuario,
  eventoId: string,
  payload: IAdicionarFotosPayload,
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

  if (evento.fotos.length + payload.fotos.length > MAX_FOTOS_POR_EVENTO) {
    throw httpError(
      STATUS_CODE.UNPROCESSABLE_ENTITY,
      "LIMITE_FOTOS_EXCEDIDO",
      `Evento excede o limite de ${MAX_FOTOS_POR_EVENTO} fotos.`,
    );
  }

  await validarAnexosVinculados("mural", payload.fotos);

  const agora = new Date();
  const ordemInicial = evento.fotos.length;
  const novasFotos: IFotoEvento[] = payload.fotos.map((foto, indice) => ({
    key: foto.key,
    nome: foto.nome,
    contentType: foto.contentType,
    tamanho: foto.tamanho,
    legenda: foto.legenda,
    ordem: ordemInicial + indice,
    enviadoPor: requester._id,
    enviadoEm: agora,
  }));

  await EventoRepository.updateOne(
    { _id: eventoId },
    { $push: { fotos: { $each: novasFotos } } },
  );

  return withFotosUrl(
    (await EventoRepository.findById(eventoId)) as IEvento,
  );
};
