import { cert, initializeApp, getApps, App } from "firebase-admin/app";
import { getMessaging, Messaging } from "firebase-admin/messaging";
import { getSsmParameter } from "./ssm";

/**
 * Mesma estratégia de `libs/mercadopago.ts`: local/dev usa o JSON direto na
 * env var (sandbox descartável); staging/prod recebem o NOME do parâmetro no
 * SSM e o valor (o service account inteiro) é buscado em runtime.
 */
const resolveServiceAccount = async (): Promise<Record<string, unknown>> => {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT as string;
  if (!raw) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT não configurado.");
  }

  const json = raw.trim().startsWith("/") ? await getSsmParameter(raw) : raw;
  return JSON.parse(json);
};

let app: App | null = null;

const getFirebaseApp = async (): Promise<App> => {
  if (!app) {
    const existente = getApps()[0];
    if (existente) {
      app = existente;
    } else {
      const serviceAccount = await resolveServiceAccount();
      app = initializeApp({ credential: cert(serviceAccount) });
    }
  }
  return app;
};

export const getMessagingClient = async (): Promise<Messaging> => {
  const firebaseApp = await getFirebaseApp();
  return getMessaging(firebaseApp);
};
