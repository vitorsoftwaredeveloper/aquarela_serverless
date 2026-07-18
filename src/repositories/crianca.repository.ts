import { createInstanceMongoose } from "./base";
import { CriancaSchema } from "../models/Crianca";
import { ICrianca } from "../types/criancas";
import {
  encryptCriancaFields,
  decryptCriancaFields,
} from "./transforms/criancaCrypto";

const base = createInstanceMongoose<ICrianca>("criancas", CriancaSchema);

/**
 * Envelope de criptografia (LGPD: CPF e dados de saúde — ver
 * `transforms/criancaCrypto.ts`) em torno do repository genérico: cifra na
 * escrita, decifra na leitura, para que os services continuem tratando
 * `ICrianca` como texto plano sem precisar saber que o dado está cifrado
 * no banco.
 */
export const CriancaRepository = {
  model: base.model,
  insertOne: async (data: any, options?: any) =>
    base.insertOne(await encryptCriancaFields(data), options),
  updateOne: async (filter: any, data: any, options?: any) => {
    if (data?.$set) {
      return base.updateOne(
        filter,
        { ...data, $set: await encryptCriancaFields(data.$set) },
        options,
      );
    }
    return base.updateOne(filter, data, options);
  },
  findOne: async (filter: any, projection?: any, options?: any) =>
    decryptCriancaFields(await base.findOne(filter, projection, options)),
  find: async (filter: any, projection?: any, options?: any) => {
    const docs = await base.find(filter, projection, options);
    return Promise.all(docs.map((doc: any) => decryptCriancaFields(doc)));
  },
  findById: async (id: any, projection?: any, options?: any) =>
    decryptCriancaFields(await base.findById(id, projection, options)),
  deleteOne: base.deleteOne,
  count: base.count,
};
