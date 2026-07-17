import { CriancaRepository } from "../../repositories/crianca.repository";
import { ICrianca } from "../../types/criancas";
import { IUsuario } from "../../types/usuarios";
import { getTurmaByIdService } from "./getTurmaById";

export const listCriancasDaTurmaService = async (
  requester: IUsuario,
  turmaId: string,
): Promise<ICrianca[]> => {
  // valida existência da turma + ownership (professor só a sua)
  await getTurmaByIdService(requester, turmaId);

  return (await CriancaRepository.find(
    { turmaId, ativo: true },
    null,
    { sort: { nome: 1 } },
  )) as ICrianca[];
};
