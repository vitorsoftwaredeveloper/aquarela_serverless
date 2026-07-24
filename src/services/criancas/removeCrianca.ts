import { db } from "../../libs/mongo";
import { CriancaRepository } from "../../repositories/crianca.repository";
import { AgendaRepository } from "../../repositories/agenda.repository";
import { MensalidadeRepository } from "../../repositories/mensalidade.repository";
import { PagamentoRepository } from "../../repositories/pagamento.repository";
import { UsuarioRepository } from "../../repositories/usuario.repository";
import { httpError, STATUS_CODE } from "../../utils/errors";

/**
 * Remoção DEFINITIVA (hard delete), diferente das demais entidades de
 * cadastro (que usam soft delete). Exceção deliberada: para só bloquear o
 * acesso preservando o histórico, use `PUT /criancas/{id}` com `ativo:false`.
 *
 * Como a criança tem histórico próprio em outras coleções (agenda diária,
 * mensalidades, pagamentos), a remoção é em CADEIA: apaga também tudo que
 * pertence só a ela, e desvincula (sem apagar) os usuários responsáveis.
 */
export const removeCriancaService = async (criancaId: string): Promise<void> => {
  const crianca = await CriancaRepository.findById(criancaId);
  if (!crianca) {
    throw httpError(STATUS_CODE.NOT_FOUND, "NOT_FOUND", "Criança não encontrada.");
  }

  await db();

  await Promise.all([
    AgendaRepository.model.deleteMany({ criancaId }),
    MensalidadeRepository.model.deleteMany({ criancaId }),
    PagamentoRepository.model.deleteMany({ criancaId }),
    // Desvincula a criança dos usuários responsáveis (mantém as contas).
    UsuarioRepository.model.updateMany(
      { criancasVinculadas: criancaId },
      { $pull: { criancasVinculadas: criancaId } },
    ),
  ]);

  await CriancaRepository.deleteOne({ _id: criancaId });
};
