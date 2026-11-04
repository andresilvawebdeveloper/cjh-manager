import { z } from 'zod';

// Esquema do relatório devolvido pela IA (structured outputs).
// Partilhado entre a rota do servidor (validação) e a página do combate (apresentação).

const Area = z.object({
  nota: z.number().describe('Nota inteira de 1 (muito fraco) a 10 (excelente)'),
  avaliacao: z.string().describe('Avaliação detalhada, como um treinador experiente a explicar ao atleta'),
  pontos_fortes: z.array(z.string()),
  pontos_a_melhorar: z.array(z.string()),
});

const Tecnica = z.object({
  nome: z.string().describe('Nome da técnica em japonês (ex: Seoi-nage, Kesa-gatame)'),
  momento: z.string().describe('Tempo aproximado no vídeo, formato mm:ss'),
  resultado: z.enum(['Ippon', 'Waza-ari', 'Sem pontuação', 'Bloqueada', 'Contra-atacada', 'Tentativa']),
  descricao: z.string().describe('Como foi preparada e executada, e porque resultou ou falhou'),
});

const AreaTecnicas = Area.extend({
  tecnicas: z.array(Tecnica),
});

const Lutador = z.object({
  nome: z.string(),
  cor_judogi: z.string(),
  kumikata: Area.describe('Pegas: tipo de pega, disputa, quebra de pegas, mão dominante, pega cruzada/cinto, etc.'),
  postura: Area.describe('Postura: shizentai/jigotai, equilíbrio, colocação da cabeça e anca, defensividade'),
  deslocamento: Area.describe('Deslocamento: tai-sabaki, uso da área, pressão, saídas da área, ritmo'),
  tachi_waza: AreaTecnicas.describe('Técnicas em pé: projeções, combinações, contra-ataques'),
  ne_waza: AreaTecnicas.describe('Técnicas no chão: transições, imobilizações, estrangulamentos, chaves, defesa no chão'),
  penalizacoes: z.array(
    z.object({
      momento: z.string(),
      tipo: z.string().describe('Ex: Shido, Hansoku-make'),
      motivo: z.string(),
    })
  ),
  pontos_fortes_gerais: z.array(z.string()),
  pontos_a_melhorar_gerais: z.array(z.string()),
});

export const RelatorioCombateSchema = z.object({
  resumo: z.string().describe('Resumo do combate e de como foi decidido'),
  vencedor_observado: z.string().describe('Quem venceu e como, ou "Indeterminado" se não for visível'),
  atleta: Lutador.describe('O atleta do clube'),
  adversario: Lutador,
  momentos_chave: z.array(
    z.object({
      momento: z.string().describe('mm:ss'),
      descricao: z.string(),
    })
  ),
  recomendacoes_treino: z.array(
    z.object({
      prioridade: z.enum(['Alta', 'Média', 'Baixa']),
      titulo: z.string(),
      descricao: z.string(),
      exercicios: z.array(z.string()),
    })
  ).describe('Plano de treino concreto para o atleta do clube'),
  limitacoes: z.string().describe('O que não foi possível avaliar com confiança (ângulo, qualidade, frames em falta)'),
});

export type RelatorioCombate = z.infer<typeof RelatorioCombateSchema>;
export type LutadorRelatorio = RelatorioCombate['atleta'];

// Parâmetros da extração de frames (no browser)
export const MAX_FRAMES = 240;
export const INTERVALO_MIN_SEGUNDOS = 0.75;
export const LADO_MAIOR_PX = 1024;

export const CORES_JUDOGI = ['Branco', 'Azul'] as const;

/** Lê a resposta colada do claude.ai (com ou sem ```json) e valida-a. */
export function interpretarRespostaClaude(texto: string): { relatorio?: RelatorioCombate; erro?: string } {
  const inicio = texto.indexOf('{');
  const fim = texto.lastIndexOf('}');
  if (inicio === -1 || fim <= inicio) return { erro: 'Não encontrei nenhum JSON na resposta. Copie a resposta completa do Claude.' };
  let dados: unknown;
  try {
    dados = JSON.parse(texto.slice(inicio, fim + 1));
  } catch {
    return { erro: 'A resposta não é JSON válido (pode ter ficado cortada). Peça ao Claude: "Repete só o JSON completo".' };
  }
  const resultado = RelatorioCombateSchema.safeParse(dados);
  if (!resultado.success) {
    const problema = resultado.error.issues[0];
    return { erro: `O JSON não tem o formato esperado (campo "${problema?.path.join('.')}"). Peça ao Claude para seguir exatamente a estrutura pedida.` };
  }
  return { relatorio: resultado.data };
}

// Parâmetros para a análise manual no claude.ai (limites de anexos e de uso do plano Pro)
export const MANUAL_MAX_FRAMES = 96;
export const MANUAL_INTERVALO_MIN = 1.5;
