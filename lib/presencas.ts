import { supabase } from './supabase/client';

const PAGINA = 1000; // limite de linhas por pedido do Supabase

/**
 * Vai buscar TODAS as presenças dos alunos indicados (com o nome do aluno),
 * pedindo por páginas para não ficar cortado nas 1000 linhas.
 */
export async function buscarTodasPresencas(alunoIds: number[]) {
  if (alunoIds.length === 0) return [];
  const todas: any[] = [];
  for (let desde = 0; ; desde += PAGINA) {
    const { data, error } = await supabase
      .from('presencas')
      .select('*, alunos(nome)')
      .in('aluno_id', alunoIds)
      .order('data', { ascending: false })
      .order('id', { ascending: true })
      .range(desde, desde + PAGINA - 1);
    if (error) throw error;
    todas.push(...(data || []));
    if (!data || data.length < PAGINA) break;
  }
  return todas;
}
