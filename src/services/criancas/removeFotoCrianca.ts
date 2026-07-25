import { CriancaRepository } from "../../repositories/crianca.repository";
import { ICrianca } from "../../types/criancas";
import { IUsuario } from "../../types/usuarios";
import { httpError, STATUS_CODE } from "../../utils/errors";
import { appendAuditoria } from "../shared/auditoriaCrianca";
import { removerFotoDoBucket } from "../shared/fotoCrianca";

/** Remove a foto do bucket e o vínculo no cadastro. Idempotente. */
export const removeFotoCriancaService = async (
  requester: IUsuario,
  criancaId: string,
): Promise<void> => {
  const crianca = (await CriancaRepository.findById(
    criancaId,
  )) as ICrianca | null;
  if (!crianca) {
    throw httpError(
      STATUS_CODE.NOT_FOUND,
      "NOT_FOUND",
      "Criança não encontrada.",
    );
  }

  if (!crianca.foto) return;

  await CriancaRepository.updateOne(
    { _id: criancaId },
    {
      $unset: { foto: "" },
      $set: { auditoria: appendAuditoria(crianca, requester._id, ["foto"]) },
    },
  );

  await removerFotoDoBucket(crianca.foto);
};
