import { createInstanceMongoose } from "./base";
import { PagamentoSchema } from "../models/Pagamento";
import { IPagamento } from "../types/pagamentos";

export const PagamentoRepository = createInstanceMongoose<IPagamento>(
  "pagamentos",
  PagamentoSchema,
);
