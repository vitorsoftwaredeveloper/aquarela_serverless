import { MercadoPagoConfig, Payment } from "mercadopago";
import { randomUUID } from "crypto";
import { getSsmParameter } from "./ssm";

/**
 * Local/dev usa o valor direto (token/segredo de sandbox); staging/prod
 * recebem o NOME do parâmetro no SSM (mesma estratégia de `libs/mongo.ts`
 * para `DB`) e o valor é buscado em runtime — assim a credencial não fica
 * em texto plano nas env vars da Lambda. `getSsmParameter` já cacheia por
 * nome de parâmetro.
 */
const resolveSecret = async (envVarName: string): Promise<string> => {
  const value = process.env[envVarName] as string;
  if (!value) {
    throw new Error(`${envVarName} não configurado.`);
  }

  return value.startsWith("/") ? getSsmParameter(value) : value;
};

const resolveAccessToken = (): Promise<string> =>
  resolveSecret("MERCADOPAGO_ACCESS_TOKEN");

export const resolveMercadoPagoWebhookSecret = (): Promise<string> =>
  resolveSecret("MERCADOPAGO_WEBHOOK_SECRET");

let config: MercadoPagoConfig | null = null;

const getConfig = async (): Promise<MercadoPagoConfig> => {
  if (!config) {
    const accessToken = await resolveAccessToken();
    config = new MercadoPagoConfig({ accessToken });
  }
  return config;
};

export interface ICobrancaPix {
  providerPaymentId: string;
  pixCopiaECola: string;
  qrBase64: string;
}

export const criarCobrancaPix = async (params: {
  valor: number;
  descricao: string;
  payerEmail: string;
}): Promise<ICobrancaPix> => {
  const mpConfig = await getConfig();
  const payment = new Payment(mpConfig);

  const result = await payment.create({
    body: {
      transaction_amount: params.valor,
      description: params.descricao,
      payment_method_id: "pix",
      payer: { email: params.payerEmail },
    },
    requestOptions: { idempotencyKey: randomUUID() },
  });

  const transactionData = result.point_of_interaction?.transaction_data;
  if (!result.id || !transactionData?.qr_code) {
    throw new Error("Falha ao gerar cobrança PIX no MercadoPago.");
  }

  return {
    providerPaymentId: String(result.id),
    pixCopiaECola: transactionData.qr_code,
    qrBase64: transactionData.qr_code_base64 ?? "",
  };
};

export interface IPagamentoMercadoPago {
  status?: string;
  externalReference?: string;
}

/**
 * Sempre busca o pagamento na API do MercadoPago em vez de confiar no corpo
 * do webhook — recomendação oficial de segurança (o body da notificação não
 * é autenticado, só o header `x-signature`).
 */
export const buscarPagamento = async (
  providerPaymentId: string,
): Promise<IPagamentoMercadoPago> => {
  const mpConfig = await getConfig();
  const payment = new Payment(mpConfig);

  const result = await payment.get({ id: providerPaymentId });

  return {
    status: result.status,
    externalReference: result.external_reference,
  };
};
