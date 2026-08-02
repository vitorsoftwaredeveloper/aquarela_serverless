import { CriancaRepository } from "../../repositories/crianca.repository";
import { ICrianca, IUpdateCriancaPayload } from "../../types/criancas";
import { IUsuario } from "../../types/usuarios";
import { isValidCpf } from "../../utils/cpf";
import { httpError, STATUS_CODE } from "../../utils/errors";
import { diaMesDeData } from "../../utils/date";
import { sincronizarMensalidadesNaoPagas } from "../mensalidades/sincronizarMensalidadesNaoPagas";
import { appendAuditoria } from "../shared/auditoriaCrianca";
import {
  assertMutacaoResponsaveis,
  assertPodeEditarCrianca,
} from "../shared/criancaAccess";
import {
  removerFotoDoBucket,
  salvarFotoBase64,
  withFotoUrl,
} from "../shared/fotoCrianca";

export const updateCriancaService = async (
  requester: IUsuario,
  criancaId: string,
  payload: IUpdateCriancaPayload,
): Promise<ICrianca> => {
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

  assertPodeEditarCrianca(requester, crianca, payload);
  assertMutacaoResponsaveis(requester, crianca, payload);

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
  const { foto, consentimentoImagem, ...camposDiretos } = payload;
  const update: Record<string, unknown> = {
    ...camposDiretos,
    ...(payload.dataNascimento && {
      dataNascimento: new Date(payload.dataNascimento),
      nascimentoDiaMes: diaMesDeData(new Date(payload.dataNascimento)),
    }),
    ...(consentimentoImagem !== undefined && {
      consentimentoImagem: {
        aceito: consentimentoImagem,
        aceitoEm: new Date(),
        registradoPor: requester._id,
      },
    }),
  };

  // Grava a imagem antes do update: se o S3 falhar, o cadastro fica intacto.
  const fotoAnterior = crianca.foto;
  if (foto) {
    update.foto = await salvarFotoBase64(criancaId, foto);
  }

  if (camposAlterados.length > 0) {
    update.auditoria = appendAuditoria(crianca, requester._id, camposAlterados);
  }

  await CriancaRepository.updateOne({ _id: criancaId }, { $set: update });

  if (payload.financeiro) {
    await sincronizarMensalidadesNaoPagas(criancaId, payload.financeiro);
  }

  // Só depois da troca gravada, para não perder a foto antiga se o update falhar.
  if (foto && fotoAnterior && fotoAnterior !== update.foto) {
    await removerFotoDoBucket(fotoAnterior);
  }

  return withFotoUrl(
    (await CriancaRepository.findById(criancaId)) as ICrianca,
  ) as Promise<ICrianca>;
};
