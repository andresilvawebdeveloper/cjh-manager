// Constantes e utilitários do módulo "Análise de Competições"
import type { SupabaseClient } from '@supabase/supabase-js';

export const GENEROS = ['Feminino', 'Masculino'] as const;
export type Genero = (typeof GENEROS)[number];

export const CATEGORIAS_PESO: Record<Genero, string[]> = {
  Feminino: ['-48kg', '-52kg', '-57kg', '-63kg', '-70kg', '+70kg'],
  Masculino: ['-34kg', '-38kg', '-42kg', '-46kg', '-50kg', '-55kg', '-60kg', '-66kg', '-73kg', '-81kg', '-90kg', '+90kg'],
};

export const RESULTADOS = ['Vitória', 'Derrota'] as const;

export const BUCKET_COMBATES = 'combates';

/** Classificação final numa competição (do melhor para o pior). */
export const CLASSIFICACOES = ['1º', '2º', '3º', '5º', '7º', '9º', 'N/C'] as const;

export function rotuloClassificacao(c: string | null | undefined) {
  if (!c) return '';
  if (c === 'N/C') return 'N/C (não classificado)';
  const medalha = c === '1º' ? '🥇 ' : c === '2º' ? '🥈 ' : c === '3º' ? '🥉 ' : '';
  return `${medalha}${c} lugar`;
}

export function estiloClassificacao(c: string | null | undefined) {
  switch (c) {
    case '1º':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case '2º':
      return 'bg-slate-100 text-slate-700 border-slate-300';
    case '3º':
      return 'bg-orange-100 text-orange-800 border-orange-300';
    case '5º':
    case '7º':
    case '9º':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'N/C':
      return 'bg-gray-100 text-gray-500 border-gray-200';
    default:
      return 'bg-white text-gray-400 border-gray-200';
  }
}

/** Posição para ordenar (1º primeiro; sem classificação no fim). */
export const ordemClassificacao = (c: string | null | undefined) => {
  const i = CLASSIFICACOES.indexOf((c || '') as any);
  return i === -1 ? CLASSIFICACOES.length : i;
};

/** Apaga do Storage os vídeos e eventuais frames de análise de uma lista de combates. */
export async function apagarFicheirosCombates(
  supabase: SupabaseClient,
  combates: { id: number; video_path: string | null }[]
) {
  if (combates.length === 0) return;
  const caminhos = combates.map((c) => c.video_path).filter((p): p is string => !!p);
  for (const c of combates) {
    const { data } = await supabase.storage.from(BUCKET_COMBATES).list(`frames/${c.id}`, { limit: 1000 });
    (data || []).forEach((f) => caminhos.push(`frames/${c.id}/${f.name}`));
  }
  if (caminhos.length > 0) await supabase.storage.from(BUCKET_COMBATES).remove(caminhos);
}

/** Envia o vídeo de um combate já registado (ex: combate criado sem vídeo) e guarda o caminho. */
export async function enviarVideoCombate(
  supabase: SupabaseClient,
  competicaoId: string | number,
  atletaId: string | number,
  combateId: number,
  ficheiro: File
): Promise<string> {
  const caminho = caminhoVideo(competicaoId, atletaId, ficheiro);
  const { error: uploadError } = await supabase.storage
    .from(BUCKET_COMBATES)
    .upload(caminho, ficheiro, { contentType: ficheiro.type || 'video/mp4', upsert: false });
  if (uploadError) throw new Error(uploadError.message);
  const { error } = await supabase.from('analise_combates').update({ video_path: caminho }).eq('id', combateId);
  if (error) {
    await supabase.storage.from(BUCKET_COMBATES).remove([caminho]);
    throw error;
  }
  return caminho;
}

export function formatarTempo(segundos: number) {
  const m = Math.floor(segundos / 60);
  const s = Math.floor(segundos % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Converte "mm:ss" (ou "m:ss") em segundos; devolve null se não for válido. */
export function tempoParaSegundos(texto: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(texto?.trim() || '');
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

export function formatarData(data: string) {
  if (!data) return '';
  const [ano, mes, dia] = data.split('-');
  return `${dia}/${mes}/${ano}`;
}

/** Caminho único no Storage para um vídeo de combate. */
export function caminhoVideo(competicaoId: string | number, atletaId: string | number, ficheiro: File) {
  const extensao = ficheiro.name.includes('.') ? ficheiro.name.split('.').pop()!.toLowerCase() : 'mp4';
  const aleatorio = Math.random().toString(36).slice(2, 8);
  return `${competicaoId}/${atletaId}/${Date.now()}-${aleatorio}.${extensao}`;
}
