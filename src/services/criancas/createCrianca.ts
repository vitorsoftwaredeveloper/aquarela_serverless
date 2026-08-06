import { Types } from "mongoose";
import { CriancaRepository } from "../../repositories/crianca.repository";
import { TurmaRepository } from "../../repositories/turma.repository";
import { gerarMensalidadesIniciaisService } from "../mensalidades/gerarMensalidadesIniciais";
import { ensureResponsavelUsuario } from "../shared/responsavelAcesso";
import {
  sincronizarCriancasVinculadas,
  usuarioIdsVinculados,
} from "../shared/vinculoResponsavel";
import { hashForLookup } from "../../libs/crypto";
import { diaMesDeData } from "../../utils/date";
import {
  IAcessoResponsavelCriado,
  ICreateCriancaPayload,
  ICreateCriancaResult,
  IResponsavel,
} from "../../types/criancas";
import { IUsuario } from "../../types/usuarios";
import { isValidCpf } from "../../utils/cpf";
import {
  httpError,
  STATUS_CODE,
  DUPLICATE_KEY_ERROR_CODE,
} from "../../utils/errors";
import {
  gravarFoto,
  removerFotoDoBucket,
  validarFotoBase64,
  withFotoUrl,
} from "../shared/fotoCrianca";

export const createCriancaService = async (
  requester: IUsuario,
  payload: ICreateCriancaPayload,
): Promise<ICreateCriancaResult> => {
  if (!isValidCpf(payload.cpf)) {
    throw httpError(
      STATUS_CODE.BAD_REQUEST,
      "INVALID_CPF",
      "CPF da criança inválido.",
    );
  }

  if (!payload.consentimentoLgpd) {
    throw httpError(
      STATUS_CODE.UNPROCESSABLE_ENTITY,
      "CONSENTIMENTO_LGPD_OBRIGATORIO",
      "É necessário confirmar o consentimento LGPD para cadastrar a criança.",
    );
  }

  for (const responsavel of payload.responsaveis) {
    if (!isValidCpf(responsavel.cpf)) {
      throw httpError(
        STATUS_CODE.BAD_REQUEST,
        "INVALID_CPF",
        `CPF do responsável "${responsavel.nome}" inválido.`,
      );
    }
  }

  if (payload.turmaId) {
    const turma = await TurmaRepository.findById(payload.turmaId);
    if (!turma) {
      throw httpError(
        STATUS_CODE.NOT_FOUND,
        "NOT_FOUND",
        "Turma não encontrada.",
      );
    }
  }

  // Checa CPF duplicado ANTES de criar acessos — evita usuários órfãos no
  // Cognito caso o insert da criança falhasse por CPF já usado.
  const jaExiste = await CriancaRepository.findOne({
    cpfHash: await hashForLookup(payload.cpf),
  });
  if (jaExiste) {
    throw httpError(
      STATUS_CODE.CONFLICT,
      "CPF_IN_USE",
      "Já existe uma criança cadastrada com este CPF.",
    );
  }

  const fotoBytes = payload.foto ? validarFotoBase64(payload.foto) : undefined;

  const acessosResponsaveis: IAcessoResponsavelCriado[] = [];
  const responsaveisComAcesso: IResponsavel[] = [];

  for (const responsavel of payload.responsaveis) {
    const { usuarioId, acessoCriado } =
      await ensureResponsavelUsuario(responsavel);
    if (acessoCriado) acessosResponsaveis.push(acessoCriado);
    responsaveisComAcesso.push({ ...responsavel, usuarioId });
  }

  const criancaId = new Types.ObjectId();
  const fotoKey =
    fotoBytes && payload.foto
      ? await gravarFoto(String(criancaId), fotoBytes, payload.foto.contentType)
      : undefined;

  let crianca;
  try {
    const created = await CriancaRepository.insertOne({
      _id: criancaId,
      nome: payload.nome,
      dataNascimento: new Date(payload.dataNascimento),
      nascimentoDiaMes: diaMesDeData(new Date(payload.dataNascimento)),
      cpf: payload.cpf,
      foto: fotoKey,
      turmaId: payload.turmaId ?? null,
      responsaveis: responsaveisComAcesso,
      saude: payload.saude ?? {},
      financeiro: payload.financeiro,
      consentimentoLgpd: { aceito: true, aceitoEm: new Date() },
      consentimentoImagem: payload.consentimentoImagem
        ? {
            aceito: true,
            aceitoEm: new Date(),
            registradoPor: requester._id,
          }
        : undefined,
      auditoria: [],
    });

    crianca = (await CriancaRepository.findById(created._id))!;

    // Gera desde já a mensalidade do mês de cadastro até dezembro — o cron
    // mensal (gerarMensalidadesDoMes) só roda dia 1 e não cobriria esse mês.
    await gerarMensalidadesIniciaisService(crianca._id, crianca.financeiro);
  } catch (error: any) {
    await removerFotoDoBucket(fotoKey);

    if (error.code === DUPLICATE_KEY_ERROR_CODE) {
      throw httpError(
        STATUS_CODE.CONFLICT,
        "CPF_IN_USE",
        "Já existe uma criança cadastrada com este CPF.",
      );
    }
    throw error;
  }

  await sincronizarCriancasVinculadas(
    String(crianca._id),
    [],
    usuarioIdsVinculados(responsaveisComAcesso),
  );

  return { crianca: await withFotoUrl(crianca), acessosResponsaveis };
};
