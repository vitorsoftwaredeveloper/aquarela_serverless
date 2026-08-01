import {
  S3Client,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let s3Client: S3Client | null = null;

const createS3Client = (): S3Client => {
  if (!s3Client) {
    s3Client = new S3Client({ region: process.env.REGION });
  }
  return s3Client;
};

export const getFotosBucket = (): string | undefined =>
  process.env.FOTOS_BUCKET || undefined;

const requireBucket = (): string => {
  const bucket = getFotosBucket();
  if (!bucket) {
    throw new Error("FOTOS_BUCKET não configurado.");
  }
  return bucket;
};

export const putObject = async (params: {
  key: string;
  body: Buffer;
  contentType: string;
}): Promise<void> => {
  await createS3Client().send(
    new PutObjectCommand({
      Bucket: requireBucket(),
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
    }),
  );
};

export const createPresignedUploadUrl = async (params: {
  key: string;
  contentType: string;
  contentLength: number;
  expiresIn: number;
}): Promise<string> =>
  getSignedUrl(
    createS3Client(),
    new PutObjectCommand({
      Bucket: requireBucket(),
      Key: params.key,
      ContentType: params.contentType,
      ContentLength: params.contentLength,
    }),
    { expiresIn: params.expiresIn },
  );

/**
 * URL pré-assinada de leitura. Assinar é HMAC local: nenhuma chamada de
 * rede ao S3 e nenhum request cobrado. Gerar uma por criança numa listagem
 * de 40 custa CPU, não requests — o download em si sai do browser direto
 * para o bucket.
 */
export const createPresignedDownloadUrl = async (params: {
  key: string;
  expiresIn: number;
}): Promise<string> =>
  getSignedUrl(
    createS3Client(),
    new GetObjectCommand({ Bucket: requireBucket(), Key: params.key }),
    { expiresIn: params.expiresIn },
  );

export const deleteObject = async (key: string): Promise<void> => {
  await createS3Client().send(
    new DeleteObjectCommand({ Bucket: requireBucket(), Key: key }),
  );
};

export interface IObjetoS3Head {
  contentType?: string;
  contentLength?: number;
}

export const headObject = async (
  key: string,
): Promise<IObjetoS3Head | null> => {
  try {
    const resultado = await createS3Client().send(
      new HeadObjectCommand({ Bucket: requireBucket(), Key: key }),
    );

    return {
      contentType: resultado.ContentType,
      contentLength: resultado.ContentLength,
    };
  } catch (error: any) {
    if (
      error?.name === "NotFound" ||
      error?.$metadata?.httpStatusCode === 404
    ) {
      return null;
    }
    throw error;
  }
};

export interface IObjetoS3Listado {
  key: string;
  lastModified?: Date;
}

export const listObjectsByPrefix = async (
  prefix: string,
): Promise<IObjetoS3Listado[]> => {
  const objetos: IObjetoS3Listado[] = [];
  let continuationToken: string | undefined;

  do {
    const resultado = await createS3Client().send(
      new ListObjectsV2Command({
        Bucket: requireBucket(),
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );

    for (const objeto of resultado.Contents ?? []) {
      if (objeto.Key) {
        objetos.push({ key: objeto.Key, lastModified: objeto.LastModified });
      }
    }

    continuationToken = resultado.NextContinuationToken;
  } while (continuationToken);

  return objetos;
};
