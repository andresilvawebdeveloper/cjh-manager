// Ranking de torneios: pontuação, épocas e cálculo das tabelas (atletas e centros).

export const CLASSIFICACOES_RANKING = ['1º', '2º', '3º', 'Sem pódio'] as const;
export type ClassificacaoRanking = (typeof CLASSIFICACOES_RANKING)[number];

export const PONTOS: Record<ClassificacaoRanking, number> = { '1º': 5, '2º': 3, '3º': 1, 'Sem pódio': 0 };

export const ROTULO_CLASSIFICACAO: Record<ClassificacaoRanking, string> = {
  '1º': '🥇 1.º lugar (5 pts)',
  '2º': '🥈 2.º lugar (3 pts)',
  '3º': '🥉 3.º lugar (1 pt)',
  'Sem pódio': 'Sem pódio (0 pts)',
};

export interface AnoEscalao {
  ano: number;
  escalao: string;
}

export interface Epoca {
  id: number;
  nome: string;
  anos: AnoEscalao[];
}

export interface Centro {
  id: number;
  nome: string;
}

export interface Resultado {
  id: number;
  prova_id: number;
  atleta_id: number;
  centro_id: number | null;
  peso: string | null;
  classificacao: ClassificacaoRanking;
}

export interface AtletaRanking {
  id: number;
  nome: string;
  ano: number;
  centro_id: number | null;
}

/** Época seguinte: o mesmo escalão passa a ser do ano de nascimento seguinte. */
export function proximaEpoca(e: Epoca): { nome: string; anos: AnoEscalao[] } {
  const [a, b] = e.nome.split('/').map((x) => Number(x));
  const nome = a && b ? `${a + 1}/${b + 1}` : `${e.nome} (seguinte)`;
  return { nome, anos: e.anos.map((x) => ({ ano: x.ano + 1, escalao: x.escalao })) };
}

export interface LinhaAtleta {
  atleta: AtletaRanking;
  centroId: number | null; // centro do resultado mais recente
  ouro: number;
  prata: number;
  bronze: number;
  provas: number;
  pontos: number;
  posicao: number;
}

export interface LinhaCentro {
  centroId: number | null;
  ouro: number;
  prata: number;
  bronze: number;
  atletas: number;
  pontos: number;
  pontosPorAno: Record<number, number>;
  posicao: number;
}

type Medalhas = { pontos: number; ouro: number; prata: number; bronze: number };

const comparar = (a: Medalhas, b: Medalhas) =>
  b.pontos - a.pontos || b.ouro - a.ouro || b.prata - a.prata || b.bronze - a.bronze;

/** Posições com empates partilhados (ex: 1, 2, 2, 4). */
function comPosicoes<T extends Medalhas>(lista: T[], desempateNome: (x: T) => string): (T & { posicao: number })[] {
  const ordenada = [...lista].sort((a, b) => comparar(a, b) || desempateNome(a).localeCompare(desempateNome(b)));
  let anterior = 0;
  return ordenada.map((x, i) => {
    const posicao = i > 0 && comparar(x, ordenada[i - 1]) === 0 ? anterior : i + 1;
    anterior = posicao;
    return { ...x, posicao };
  });
}

/**
 * Calcula as tabelas. `ano` = null para todos os anos.
 * `provasPorData` serve para saber qual o resultado mais recente de cada atleta (centro atual).
 */
export function calcularRanking(
  atletas: AtletaRanking[],
  resultados: Resultado[],
  provasPorData: Map<number, string>,
  ano: number | null
) {
  const atletasFiltrados = atletas.filter((a) => ano === null || a.ano === ano);
  const ids = new Set(atletasFiltrados.map((a) => a.id));
  const res = resultados.filter((r) => ids.has(r.atleta_id));

  // --- Atletas ---
  const porAtleta = new Map<number, LinhaAtleta>();
  atletasFiltrados.forEach((a) =>
    porAtleta.set(a.id, { atleta: a, centroId: a.centro_id, ouro: 0, prata: 0, bronze: 0, provas: 0, pontos: 0, posicao: 0 })
  );
  const dataMaisRecente = new Map<number, string>();
  res.forEach((r) => {
    const l = porAtleta.get(r.atleta_id)!;
    l.provas += 1;
    l.pontos += PONTOS[r.classificacao] ?? 0;
    if (r.classificacao === '1º') l.ouro += 1;
    if (r.classificacao === '2º') l.prata += 1;
    if (r.classificacao === '3º') l.bronze += 1;
    const data = provasPorData.get(r.prova_id) || '';
    if (r.centro_id && data >= (dataMaisRecente.get(r.atleta_id) || '')) {
      dataMaisRecente.set(r.atleta_id, data);
      l.centroId = r.centro_id;
    }
  });
  const linhasAtletas = comPosicoes(
    Array.from(porAtleta.values()).filter((l) => l.provas > 0),
    (l) => l.atleta.nome
  );

  // --- Centros (os pontos contam para o centro por que o atleta competiu em cada prova) ---
  const atletaPorId = new Map(atletasFiltrados.map((a) => [a.id, a]));
  const porCentro = new Map<string, LinhaCentro & { _atletas: Set<number> }>();
  res.forEach((r) => {
    const centroId = r.centro_id ?? atletaPorId.get(r.atleta_id)?.centro_id ?? null;
    const chave = String(centroId);
    if (!porCentro.has(chave)) {
      porCentro.set(chave, { centroId, ouro: 0, prata: 0, bronze: 0, atletas: 0, pontos: 0, pontosPorAno: {}, posicao: 0, _atletas: new Set() });
    }
    const c = porCentro.get(chave)!;
    const p = PONTOS[r.classificacao] ?? 0;
    c.pontos += p;
    const anoAtleta = atletaPorId.get(r.atleta_id)?.ano;
    if (anoAtleta) c.pontosPorAno[anoAtleta] = (c.pontosPorAno[anoAtleta] || 0) + p;
    if (r.classificacao === '1º') c.ouro += 1;
    if (r.classificacao === '2º') c.prata += 1;
    if (r.classificacao === '3º') c.bronze += 1;
    c._atletas.add(r.atleta_id);
  });
  const linhasCentros = comPosicoes(
    Array.from(porCentro.values()).map(({ _atletas, ...c }) => ({ ...c, atletas: _atletas.size })),
    (c) => String(c.centroId)
  );

  return { atletas: linhasAtletas, centros: linhasCentros };
}

export const normalizarNome = (s: string) => s.trim().replace(/\s+/g, ' ');
