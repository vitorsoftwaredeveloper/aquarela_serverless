import { encrypt, decrypt, hashForLookup } from "../../libs/crypto";
import { ICrianca, IResponsavel, ISaude, IMedicacaoContinua } from "../../types/criancas";

const encryptOptional = async (value?: string): Promise<string | undefined> =>
  value === undefined || value === null ? value : encrypt(value);

const decryptOptional = async (value?: string): Promise<string | undefined> =>
  value === undefined || value === null ? value : decrypt(value);

const encryptStringArray = async (
  values?: string[],
): Promise<string[] | undefined> =>
  values ? Promise.all(values.map((value) => encrypt(value))) : values;

const decryptStringArray = async (
  values?: string[],
): Promise<string[] | undefined> =>
  values ? Promise.all(values.map((value) => decrypt(value))) : values;

const encryptResponsaveis = async (
  responsaveis?: IResponsavel[],
): Promise<IResponsavel[] | undefined> =>
  responsaveis
    ? Promise.all(
        responsaveis.map(async (responsavel) => ({
          ...responsavel,
          cpf: await encrypt(responsavel.cpf),
        })),
      )
    : responsaveis;

const decryptResponsaveis = async (
  responsaveis?: IResponsavel[],
): Promise<IResponsavel[] | undefined> =>
  responsaveis
    ? Promise.all(
        responsaveis.map(async (responsavel) => ({
          ...responsavel,
          cpf: await decrypt(responsavel.cpf),
        })),
      )
    : responsaveis;

const encryptMedicacoesContinuas = async (
  medicacoes?: IMedicacaoContinua[],
): Promise<IMedicacaoContinua[] | undefined> =>
  medicacoes
    ? Promise.all(
        medicacoes.map(async (medicacao) => ({
          ...medicacao,
          nome: await encrypt(medicacao.nome),
          dose: await encrypt(medicacao.dose),
          horario: await encrypt(medicacao.horario),
          observacao: await encryptOptional(medicacao.observacao),
        })),
      )
    : medicacoes;

const decryptMedicacoesContinuas = async (
  medicacoes?: IMedicacaoContinua[],
): Promise<IMedicacaoContinua[] | undefined> =>
  medicacoes
    ? Promise.all(
        medicacoes.map(async (medicacao) => ({
          ...medicacao,
          nome: await decrypt(medicacao.nome),
          dose: await decrypt(medicacao.dose),
          horario: await decrypt(medicacao.horario),
          observacao: await decryptOptional(medicacao.observacao),
        })),
      )
    : medicacoes;

const encryptSaude = async (saude?: ISaude): Promise<ISaude | undefined> =>
  saude
    ? {
        ...saude,
        alergias: await encryptStringArray(saude.alergias),
        restricoesAlimentares: await encryptStringArray(
          saude.restricoesAlimentares,
        ),
        medicacoesContinuas: await encryptMedicacoesContinuas(
          saude.medicacoesContinuas,
        ),
        condicoesAtipicas: await encryptStringArray(saude.condicoesAtipicas),
        cuidadosEspeciais: await encryptOptional(saude.cuidadosEspeciais),
        observacoes: await encryptOptional(saude.observacoes),
      }
    : saude;

const decryptSaude = async (saude?: ISaude): Promise<ISaude | undefined> =>
  saude
    ? {
        ...saude,
        alergias: await decryptStringArray(saude.alergias),
        restricoesAlimentares: await decryptStringArray(
          saude.restricoesAlimentares,
        ),
        medicacoesContinuas: await decryptMedicacoesContinuas(
          saude.medicacoesContinuas,
        ),
        condicoesAtipicas: await decryptStringArray(saude.condicoesAtipicas),
        cuidadosEspeciais: await decryptOptional(saude.cuidadosEspeciais),
        observacoes: await decryptOptional(saude.observacoes),
      }
    : saude;

/**
 * Cifra os campos sensíveis (LGPD: CPF e dados de saúde) antes de gravar.
 * `cpfHash` é um HMAC determinístico usado como índice único de busca — o
 * `cpf` cifrado usa IV aleatório e nunca é comparável entre dois registros.
 * CPF é imutável após a criação (fora de `IUpdateCriancaPayload`), então só
 * aparece aqui no create; updates só tocam `responsaveis`/`saude`.
 */
export const encryptCriancaFields = async <T extends Record<string, unknown>>(
  data: T,
): Promise<T> => {
  const result: any = { ...data };

  if (typeof data.cpf === "string") {
    result.cpf = await encrypt(data.cpf);
    result.cpfHash = await hashForLookup(data.cpf);
  }
  if (data.responsaveis !== undefined) {
    result.responsaveis = await encryptResponsaveis(
      data.responsaveis as IResponsavel[],
    );
  }
  if (data.saude !== undefined) {
    result.saude = await encryptSaude(data.saude as ISaude);
  }

  return result;
};

/**
 * Decifra os campos sensíveis de um documento lido do banco. `cpfHash`
 * nunca é devolvido ao chamador — é um detalhe interno do índice único.
 */
export const decryptCriancaFields = async (
  data: (Partial<ICrianca> & { cpfHash?: string }) | null,
): Promise<ICrianca | null> => {
  if (!data) return data as null;

  const result: any = { ...data };
  delete result.cpfHash;

  if (typeof data.cpf === "string") {
    result.cpf = await decrypt(data.cpf);
  }
  if (data.responsaveis !== undefined) {
    result.responsaveis = await decryptResponsaveis(data.responsaveis);
  }
  if (data.saude !== undefined) {
    result.saude = await decryptSaude(data.saude);
  }

  return result;
};
