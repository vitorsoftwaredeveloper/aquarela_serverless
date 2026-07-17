import { CriancaRepository } from "../../repositories/crianca.repository";
import { ICrianca, IUpdateCriancaPayload } from "../../types/criancas";
import { IUsuario } from "../../types/usuarios";
import { isValidCpf } from "../../utils/cpf";
import { httpError, STATUS_CODE } from "../../utils/errors";

const AUDITORIA_MAX_ENTRIES = 50;

export const updateCriancaService = async (
  requester: IUsuario,
  criancaId: string,
  payload: IUpdateCriancaPayload,
): Promise<ICrianca> => {
  const crianca = (await CriancaRepository.findById(
    criancaId,
  )) as ICrianca | null;
  if (!crianca) {
    throw httpError(STATUS_CODE.NOT_FOUND, "NOT_FOUND", "Criança não encontrada.");
  }

  if (payload.responsaveis) {
    for (const responsavel of payload.responsaveis) {
      if (!isValidCpf(responsavel.cpf)) {
        throw httpError(
          STATUS_CODE.BAD_REQUEST,
          "INVALID_CPF",
          `CPF do responsável "${responsavel.nome}" inválido.`,
        );
      }
    }
  }

  const camposAlterados = Object.keys(payload);
  const update: Record<string, unknown> = {
    ...payload,
    ...(payload.dataNascimento && {
      dataNascimento: new Date(payload.dataNascimento),
    }),
  };

  if (camposAlterados.length > 0) {
    const auditoria = [
      ...(crianca.auditoria ?? []),
      {
        usuarioId: requester._id,
        alteradoEm: new Date(),
        campos: camposAlterados,
      },
    ].slice(-AUDITORIA_MAX_ENTRIES);

    update.auditoria = auditoria;
  }

  await CriancaRepository.updateOne({ _id: criancaId }, { $set: update });

  return (await CriancaRepository.findById(criancaId)) as ICrianca;
};
