import {
  S3Client,
  DeleteObjectCommand,
  GetObjectCommand,
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
