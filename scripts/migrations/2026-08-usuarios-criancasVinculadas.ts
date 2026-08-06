import mongoose from "mongoose";
import { db } from "../../src/libs/mongo";
import { UsuarioRepository } from "../../src/repositories/usuario.repository";
import { CriancaRepository } from "../../src/repositories/crianca.repository";

const aplicar = process.argv.includes("--apply");

const run = async (): Promise<void> => {
  await db();

  if (!aplicar) {
    console.log("MODO SIMULAÇÃO — nada será gravado (use --apply para gravar)");
  }

  const usuarios = await UsuarioRepository.model.collection
    .find({ papel: "responsavel" })
    .toArray();

  console.log(`responsáveis analisados: ${usuarios.length}`);

  let corrigidos = 0;

  for (const usuario of usuarios) {
    const criancas = await CriancaRepository.model.collection
      .find(
        {
          "responsaveis.usuarioId": {
            $in: [usuario._id, String(usuario._id)],
          },
        },
        { projection: { _id: 1 } },
      )
      .toArray();

    const corretas = criancas.map((crianca) => crianca._id);
    const atuais = (usuario.criancasVinculadas ?? []) as unknown[];

    const orfas = atuais.filter(
      (id) => !corretas.some((correta) => String(correta) === String(id)),
    );
    const faltantes = corretas.filter(
      (id) => !atuais.some((atual) => String(atual) === String(id)),
    );

    if (orfas.length === 0 && faltantes.length === 0) continue;

    if (aplicar) {
      await UsuarioRepository.model.collection.updateOne(
        { _id: usuario._id },
        { $set: { criancasVinculadas: corretas } },
      );
    }

    corrigidos += 1;
    console.log(
      `${aplicar ? "corrigido" : "corrigiria"} usuario ${usuario._id} (${usuario.email}) -> remove: [${orfas.join(", ")}] adiciona: [${faltantes.join(", ")}]`,
    );
  }

  console.log(
    aplicar
      ? `migração concluída — ${corrigidos} usuário(s) corrigido(s)`
      : `simulação concluída — ${corrigidos} usuário(s) seriam corrigidos (rode com --apply)`,
  );
};

run()
  .then(() => mongoose.disconnect())
  .catch((err) => {
    console.error("migração falhou", err);
    return mongoose.disconnect().finally(() => process.exit(1));
  });
