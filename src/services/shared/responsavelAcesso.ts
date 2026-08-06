import { UsuarioRepository } from "../../repositories/usuario.repository";
import { createUsuarioService } from "../usuarios/createUsuario";
import { IAcessoResponsavelCriado, IResponsavel } from "../../types/criancas";
import { IUsuario } from "../../types/usuarios";

export const ensureResponsavelUsuario = async (
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
