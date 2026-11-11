const PAGINA = 1000; // o Supabase devolve no máximo 1000 linhas por pedido

/** Lê todas as linhas de uma consulta, pedindo por páginas. */
export async function lerTudo<T = any>(consulta: (de: number, ate: number) => any): Promise<T[]> {
  const todas: T[] = [];
  for (let de = 0; ; de += PAGINA) {
    const { data, error } = await consulta(de, de + PAGINA - 1);
    if (error) throw error;
    todas.push(...(data || []));
    if (!data || data.length < PAGINA) break;
  }
  return todas;
}
