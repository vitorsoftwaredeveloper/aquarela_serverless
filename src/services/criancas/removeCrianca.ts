import { db } from "../../libs/mongo";
import { CriancaRepository } from "../../repositories/crianca.repository";
import { AgendaRepository } from "../../repositories/agenda.repository";
import { MensalidadeRepository } from "../../repositories/mensalidade.repository";
import { PagamentoRepository } from "../../repositories/pagamento.repository";
import { UsuarioRepository } from "../../repositories/usuario.repository";
import { removeUsuarioService } from "../usuarios/removeUsuario";
import { IUsuario } from "../../types/usuarios";
import { httpError, STATUS_CODE } from "../../utils/errors";
import { removerFotoDoBucket } from "../shared/fotoCrianca";

export const removeCriancaService = async (
  criancaId: string,
): Promise<void> => {
  const crianca = await CriancaRepository.findById(criancaId);
  if (!crianca) {
    throw httpError(
      STATUS_CODE.NOT_FOUND,
      "NOT_FOUND",
      "Criança não encontrada.",
    );
  }

  await db();

  await Promise.all([
    AgendaRepository.model.deleteMany({ criancaId }),
    MensalidadeRepository.model.deleteMany({ criancaId }),
    PagamentoRepository.model.deleteMany({ criancaId }),
    UsuarioRepository.model.updateMany(
      { criancasVinculadas: criancaId },
      { $pull: { criancasVinculadas: criancaId } },
    ),
  ]);

  await CriancaRepository.deleteOne({ _id: criancaId });

  await removerFotoDoBucket(crianca.foto);

  const usuarioIds = [
    ...new Set(
      crianca.responsaveis
        .map((responsavel) => responsavel.usuarioId)
        .filter((usuarioId): usuarioId is string => Boolean(usuarioId))
        .map(String),
    ),
  ];

  for (const usuarioId of usuarioIds) {
    const aindaVinculado = await CriancaRepository.count({
      "responsaveis.usuarioId": usuarioId,
    });
    if (aindaVinculado > 0) continue;

    const usuario = (await UsuarioRepository.findById(
      usuarioId,
    )) as IUsuario | null;
    if (!usuario || usuario.papel !== "responsavel") continue;

    await removeUsuarioService(usuarioId);
  }
};
