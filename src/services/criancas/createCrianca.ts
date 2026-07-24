import { CriancaRepository } from "../../repositories/crianca.repository";
import { TurmaRepository } from "../../repositories/turma.repository";
import { UsuarioRepository } from "../../repositories/usuario.repository";
import { createUsuarioService } from "../usuarios/createUsuario";
import { gerarMensalidadesIniciaisService } from "../mensalidades/gerarMensalidadesIniciais";
import { hashForLookup } from "../../libs/crypto";
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

/**
 * Garante um usuário (papel=responsavel) para o e-mail do responsável.
 * Reaproveita o existente; cria (Cognito + banco) quando não existe.
 * Devolve o `_id` e, se criado agora, a senha temporária para o admin repassar.
 */
const ensureResponsavelUsuario = async (
  responsavel: IResponsavel,
): Promise<{ usuarioId: string; acessoCriado?: IAcessoResponsavelCriado }> => {
  const email = responsavel.email.toLowerCase();

  const existente = (await UsuarioRepository.findOne({
    email,
  })) as IUsuario | null;

  if (existente) {
    return { usuarioId: existente._id };
  }

  const criado = await createUsuarioService({
    nome: responsavel.nome,
    email,
    papel: "responsavel",
    telefone: responsavel.telefone,
  });

  return {
    usuarioId: criado._id,
    acessoCriado: {
      nome: criado.nome,
      email: criado.email,
      senhaTemporaria: criado.senhaTemporaria,
    },
  };
};

export const createCriancaService = async (
  payload: ICreateCriancaPayload,
): Promise<ICreateCriancaResult> => {
  if (!isValidCpf(payload.cpf)) {
    throw httpError(STATUS_CODE.BAD_REQUEST, "INVALID_CPF", "CPF da criança inválido.");
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
    if (!turma || !(turma as any).ativo) {
      throw httpError(STATUS_CODE.NOT_FOUND, "NOT_FOUND", "Turma não encontrada.");
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

  // Garante o acesso (usuário papel=responsavel) de cada responsável e vincula
  // o `usuarioId` no responsável embutido, antes de gravar a criança.
  const acessosResponsaveis: IAcessoResponsavelCriado[] = [];
  const usuarioIds: string[] = [];
  const responsaveisComAcesso: IResponsavel[] = [];

  for (const responsavel of payload.responsaveis) {
    const { usuarioId, acessoCriado } =
      await ensureResponsavelUsuario(responsavel);
    usuarioIds.push(usuarioId);
    if (acessoCriado) acessosResponsaveis.push(acessoCriado);
    responsaveisComAcesso.push({ ...responsavel, usuarioId });
  }

  let crianca;
  try {
    const created = await CriancaRepository.insertOne({
      nome: payload.nome,
      dataNascimento: new Date(payload.dataNascimento),
      cpf: payload.cpf,
      foto: payload.foto,
      turmaId: payload.turmaId ?? null,
      responsaveis: responsaveisComAcesso,
      saude: payload.saude ?? {},
      financeiro: payload.financeiro,
      auditoria: [],
      ativo: true,
    });

    crianca = (await CriancaRepository.findById(created._id))!;

    // Gera desde já a mensalidade do mês de cadastro até dezembro — o cron
    // mensal (gerarMensalidadesDoMes) só roda dia 1 e não cobriria esse mês.
    await gerarMensalidadesIniciaisService(crianca._id, crianca.financeiro);
  } catch (error: any) {
    if (error.code === DUPLICATE_KEY_ERROR_CODE) {
      throw httpError(
        STATUS_CODE.CONFLICT,
        "CPF_IN_USE",
        "Já existe uma criança cadastrada com este CPF.",
      );
    }
    throw error;
  }

  // Vincula a criança aos usuários responsáveis (lista em usuarios).
  await Promise.all(
    usuarioIds.map((usuarioId) =>
      UsuarioRepository.updateOne(
        { _id: usuarioId },
        { $addToSet: { criancasVinculadas: crianca._id } },
      ),
    ),
  );

  return { crianca, acessosResponsaveis };
};
