// Constantes e utilitários do módulo "Análise de Competições"
import type { SupabaseClient } from '@supabase/supabase-js';

export const GENEROS = ['Feminino', 'Masculino'] as const;
export type Genero = (typeof GENEROS)[number];

export const CATEGORIAS_PESO: Record<Genero, string[]> = {
  Feminino: ['-48kg', '-52kg', '-63kg', '-70kg', '+70kg'],
  Masculino: ['-34kg', '-38kg', '-42kg', '-46kg', '-50kg', '-55kg', '-60kg', '-66kg', '-73kg', '-81kg', '-90kg', '+90kg'],
};

export const RESULTADOS = ['Vitória', 'Derrota'] as const;

export const BUCKET_COMBATES = 'combates';

/** Apaga do Storage os vídeos e eventuais frames de análise de uma lista de combates. */
export async function apagarFicheirosCombates(
  supabase: SupabaseClient,
  combates: { id: number; video_path: string }[]
) {
  if (combates.length === 0) return;
  const caminhos = combates.map((c) => c.video_path);
  for (const c of combates) {
    const { data } = await supabase.storage.from(BUCKET_COMBATES).list(`frames/${c.id}`, { limit: 1000 });
    (data || []).forEach((f) => caminhos.push(`frames/${c.id}/${f.name}`));
  }
  await supabase.storage.from(BUCKET_COMBATES).remove(caminhos);
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
