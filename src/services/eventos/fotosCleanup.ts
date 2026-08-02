import { deleteObject } from "../../libs/s3";
import { IFotoEvento } from "../../types/eventos";

export const removerFotosDoBucket = async (
  fotos: IFotoEvento[],
): Promise<void> => {
  await Promise.all(
    fotos.map(async (foto) => {
      try {
        await deleteObject(foto.key);
      } catch (error) {
        console.error("falha ao remover foto do evento no S3", {
          key: foto.key,
          error,
        });
      }
    }),
  );
};
