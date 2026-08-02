import mongoose from "mongoose";
import { db } from "../../src/libs/mongo";
import { TurmaRepository } from "../../src/repositories/turma.repository";

const run = async (): Promise<void> => {
  await db();

  const collection = TurmaRepository.model.collection;

  const pendentes = await collection
    .find({
      professorIds: { $exists: false },
      professorId: { $exists: true },
    })
    .toArray();

  console.log(`turmas pendentes de migração: ${pendentes.length}`);

  for (const turma of pendentes) {
    await collection.updateOne(
      { _id: turma._id },
      {
        $set: { professorIds: [turma.professorId] },
        $unset: { professorId: "" },
      },
    );
    console.log(`turma ${turma._id} migrada -> professorIds: [${turma.professorId}]`);
  }

  console.log("migração concluída");
};

run()
  .then(() => mongoose.disconnect())
  .catch((err) => {
    console.error("migração falhou", err);
    return mongoose.disconnect().finally(() => process.exit(1));
  });
