import mongoose from "mongoose";
import { db } from "../../src/libs/mongo";
import { CriancaRepository } from "../../src/repositories/crianca.repository";
import { diaMesDeData } from "../../src/utils/date";

const run = async (): Promise<void> => {
  await db();

  const collection = CriancaRepository.model.collection;

  const pendentes = await collection
    .find({ nascimentoDiaMes: { $exists: false } })
    .toArray();

  console.log(`crianças pendentes de migração: ${pendentes.length}`);

  for (const crianca of pendentes) {
    const nascimentoDiaMes = diaMesDeData(new Date(crianca.dataNascimento));
    await collection.updateOne(
      { _id: crianca._id },
      { $set: { nascimentoDiaMes, ultimoAniversarioNotificadoEm: null } },
    );
    console.log(`criança ${crianca._id} migrada -> nascimentoDiaMes: ${nascimentoDiaMes}`);
  }

  console.log("migração concluída");
};

run()
  .then(() => mongoose.disconnect())
  .catch((err) => {
    console.error("migração falhou", err);
    return mongoose.disconnect().finally(() => process.exit(1));
  });
