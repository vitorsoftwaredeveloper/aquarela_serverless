import { createHmac, timingSafeEqual } from "crypto";

interface IVerifySignatureParams {
  xSignature: string;
  xRequestId: string;
  dataId: string;
  secret: string;
}

const parseXSignature = (xSignature: string): { ts?: string; v1?: string } =>
  xSignature.split(",").reduce<{ ts?: string; v1?: string }>((acc, part) => {
    const [key, value] = part.split("=");
    if (key?.trim() === "ts") acc.ts = value?.trim();
    if (key?.trim() === "v1") acc.v1 = value?.trim();
    return acc;
  }, {});

/**
 * Verifica a assinatura do webhook do MercadoPago. Esquema oficial: header
 * `x-signature: ts=<epoch>,v1=<hmac>` sobre o manifest
 * `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`, HMAC-SHA256 com o
 * segredo do webhook.
 */
export const verifyMercadoPagoSignature = ({
  xSignature,
  xRequestId,
  dataId,
  secret,
}: IVerifySignatureParams): boolean => {
  const { ts, v1 } = parseXSignature(xSignature);
  if (!ts || !v1) return false;

  const manifest = `id:${dataId.toLowerCase()};request-id:${xRequestId};ts:${ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");

  const expectedBuffer = Buffer.from(expected, "hex");
  const actualBuffer = Buffer.from(v1, "hex");
  if (expectedBuffer.length !== actualBuffer.length) return false;

  return timingSafeEqual(expectedBuffer, actualBuffer);
};
