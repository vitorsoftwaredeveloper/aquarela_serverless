import { db } from "../../libs/mongo";
import { deleteObject, listObjectsByPrefix } from "../../libs/s3";
import { AgendaRepository } from "../../repositories/agenda.repository";
import { EventoRepository } from "../../repositories/evento.repository";
import { MensagemRepository } from "../../repositories/mensagem.repository";
import { EscopoAnexo } from "../../types/anexos";
import { PREFIXO_POR_ESCOPO } from "./anexoConstantes";

const IDADE_MAXIMA_MS = 24 * 60 * 60 * 1000;

const CHAVES_VINCULADAS_POR_ESCOPO: Record<EscopoAnexo, () => Promise<string[]>> = {
  mensagem: () => MensagemRepository.model.distinct("anexos.key"),
  agenda: () => AgendaRepository.model.distinct("anexos.key"),
  mural: () => EventoRepository.model.distinct("fotos.key"),
};

/**
 * Só apaga anexo que nunca foi vinculado a nada (upload abandonado). Sem o
 * filtro de vinculação, qualquer objeto com mais de 24h sumia do bucket
 * mesmo já vinculado a recado/agenda/evento publicado — a referência ficava
 * órfã no Mongo e o link virava 403 no S3.
 */
export const limparAnexosOrfaosService = async (): Promise<{
  removidos: number;
}> => {
  await db();
  const agora = Date.now();
  let removidos = 0;

  for (const [escopo, prefixo] of Object.entries(PREFIXO_POR_ESCOPO) as [
    EscopoAnexo,
    string,
  ][]) {
    const [objetos, chavesVinculadas] = await Promise.all([
      listObjectsByPrefix(`${prefixo}/`),
      CHAVES_VINCULADAS_POR_ESCOPO[escopo](),
    ]);
    const vinculadas = new Set(chavesVinculadas);

    for (const objeto of objetos) {
      if (vinculadas.has(objeto.key)) continue;

      const idade = agora - (objeto.lastModified?.getTime() ?? agora);
      if (idade < IDADE_MAXIMA_MS) continue;

      await deleteObject(objeto.key);
      removidos += 1;
    }
  }

  return { removidos };
};
