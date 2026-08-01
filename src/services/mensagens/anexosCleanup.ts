import { deleteObject } from "../../libs/s3";
import { IMensagem } from "../../types/mensagens";

export const removerAnexosDoBucket = async (
  anexos: IMensagem["anexos"],
): Promise<void> => {
  await Promise.all(
    anexos.map(async (anexo) => {
      try {
        await deleteObject(anexo.key);
      } catch (error) {
        console.error("falha ao remover anexo da mensagem no S3", {
          key: anexo.key,
          error,
        });
      }
    }),
  );
};
