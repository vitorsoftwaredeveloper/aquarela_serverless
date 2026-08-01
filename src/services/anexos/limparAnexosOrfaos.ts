import { deleteObject, listObjectsByPrefix } from "../../libs/s3";
import { PREFIXO_POR_ESCOPO } from "./anexoConstantes";

const IDADE_MAXIMA_MS = 24 * 60 * 60 * 1000;

export const limparAnexosOrfaosService = async (): Promise<{
  removidos: number;
}> => {
  const agora = Date.now();
  let removidos = 0;

  for (const prefixo of Object.values(PREFIXO_POR_ESCOPO)) {
    const objetos = await listObjectsByPrefix(`${prefixo}/`);

    for (const objeto of objetos) {
      const idade = agora - (objeto.lastModified?.getTime() ?? agora);
      if (idade < IDADE_MAXIMA_MS) continue;

      await deleteObject(objeto.key);
      removidos += 1;
    }
  }

  return { removidos };
};
