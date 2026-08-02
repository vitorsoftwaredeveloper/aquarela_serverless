import { notificarAniversariantesService } from "../../services/criancas/notificarAniversariantes";

/**
 * Acionado por schedule (08:00 GMT-3, ver functions.yml) — notifica
 * responsáveis e professores das crianças que fazem aniversário hoje.
 */
export const execute = async (): Promise<void> => {
  const resultado = await notificarAniversariantesService();
  console.log("notificarAniversariantes", resultado);
};
