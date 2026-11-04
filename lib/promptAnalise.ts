// Prompt do "treinador IA", partilhado pela análise automática (API) e pela análise manual no claude.ai.

export const SYSTEM_PROMPT = `És um treinador de Judo de alto rendimento, com mais de 30 anos de experiência, 7.º Dan, com passagem por seleções nacionais e vasta experiência como analista de combates em competições IJF. Conheces profundamente o Kodokan Judo, as regras de arbitragem IJF em vigor e a metodologia de treino de jovens e seniores.

A tua função é analisar o vídeo de um combate e produzir um relatório técnico-tático completo, honesto e útil para o treinador do clube e para o atleta.

Recebes uma sequência de frames do vídeo, por ordem cronológica, cada um precedido do tempo em que foi capturado (mm:ss). Os frames são amostras: entre dois frames passa algum tempo, por isso reconstrói as ações a partir da sequência (preparação, entrada, projeção, seguimento para o chão) e não inventes o que não se vê.

Analisa os DOIS lutadores, separadamente, em:
- Kumikata: quem ganha a disputa de pegas, tipo de pega (clássica, cruzada, cinto, gola alta, manga), mão dominante (ai-yotsu / kenka-yotsu), quebras de pega, tempo sem pega.
- Postura: shizentai vs jigotai, equilíbrio, posição da anca e da cabeça, postura defensiva/passiva.
- Deslocamento: tai-sabaki, pressão e controlo da área, saídas da área, ritmo, criação de kuzushi pelo movimento.
- Tachi-waza: técnicas tentadas e conseguidas, combinações (renraku-waza), contra-ataques (kaeshi-waza), qualidade de kuzushi/tsukuri/kake.
- Ne-waza: transições pé→chão, imobilizações, shime-waza, kansetsu-waza, defesa e saídas.
- Pontuações e penalizações observadas (Ippon, Waza-ari, Shido) e o seu motivo provável.

Regras:
- Usa a nomenclatura japonesa correta das técnicas.
- Dá notas de 1 a 10 por área, de forma criteriosa e comparável entre os dois lutadores.
- Sê concreto: refere tempos (mm:ss) sempre que possível.
- Se algo não for visível ou for incerto (ângulo, oclusão, qualidade), diz isso e regista-o em "limitacoes" em vez de adivinhar.
- As recomendações de treino são para o atleta do clube: concretas, priorizadas e com exercícios aplicáveis no tatami.
- Escreve tudo em português de Portugal.`;

export interface ContextoCombate {
  competicao?: string;
  data?: string;
  categoria?: string;
  ronda?: string | null;
  atleta: string;
  corAtleta: string;
  adversario?: string | null;
  resultado?: string | null;
}

export function linhasContexto(c: ContextoCombate) {
  const corAdversario = c.corAtleta === 'Azul' ? 'Branco' : 'Azul';
  return [
    `Competição: ${c.competicao ?? '—'}${c.data ? ` (${c.data})` : ''}`,
    c.categoria ? `Categoria: ${c.categoria}` : null,
    c.ronda ? `Ronda: ${c.ronda}` : null,
    `Atleta do clube: ${c.atleta} — judogi ${c.corAtleta}`,
    `Adversário: ${c.adversario || 'Nome desconhecido'} — judogi ${corAdversario}`,
    c.resultado ? `Resultado registado pelo treinador: ${c.resultado} do atleta do clube` : null,
  ].filter(Boolean) as string[];
}

const AREA_MODELO = {
  nota: 0,
  avaliacao: '...',
  pontos_fortes: ['...'],
  pontos_a_melhorar: ['...'],
};
const TECNICA_MODELO = {
  nome: 'Seoi-nage',
  momento: 'mm:ss',
  resultado: 'Ippon | Waza-ari | Sem pontuação | Bloqueada | Contra-atacada | Tentativa',
  descricao: '...',
};
const LUTADOR_MODELO = {
  nome: '...',
  cor_judogi: 'Branco | Azul',
  kumikata: AREA_MODELO,
  postura: AREA_MODELO,
  deslocamento: AREA_MODELO,
  tachi_waza: { ...AREA_MODELO, tecnicas: [TECNICA_MODELO] },
  ne_waza: { ...AREA_MODELO, tecnicas: [TECNICA_MODELO] },
  penalizacoes: [{ momento: 'mm:ss', tipo: 'Shido', motivo: '...' }],
  pontos_fortes_gerais: ['...'],
  pontos_a_melhorar_gerais: ['...'],
};
const RELATORIO_MODELO = {
  resumo: '...',
  vencedor_observado: '...',
  atleta: LUTADOR_MODELO,
  adversario: LUTADOR_MODELO,
  momentos_chave: [{ momento: 'mm:ss', descricao: '...' }],
  recomendacoes_treino: [{ prioridade: 'Alta | Média | Baixa', titulo: '...', descricao: '...', exercicios: ['...'] }],
  limitacoes: '...',
};

/** Prompt completo para colar no claude.ai, junto com as folhas de contacto. */
export function construirPromptManual(c: ContextoCombate, numFolhas: number, framesPorFolha: number, numFrames: number) {
  return `${SYSTEM_PROMPT}

---

DADOS DO COMBATE
${linhasContexto(c).join('\n')}

IMAGENS
Anexei ${numFolhas} imagens ("folhas de contacto") com ${numFrames} frames do combate no total. Cada folha tem até ${framesPorFolha} frames, a ler da esquerda para a direita e de cima para baixo. Cada frame tem no canto superior esquerdo o número do frame e o tempo no vídeo (mm:ss). As folhas estão numeradas pela ordem do combate (folha-01, folha-02, ...).

FORMATO DA RESPOSTA
Responde APENAS com um bloco JSON válido (sem texto antes nem depois), exatamente com esta estrutura. "nota" é um número inteiro de 1 a 10. Os campos com "|" indicam os valores possíveis: escolhe um. As listas podem ter os elementos que forem necessários (ou ficar vazias).

\`\`\`json
${JSON.stringify(RELATORIO_MODELO, null, 2)}
\`\`\``;
}
