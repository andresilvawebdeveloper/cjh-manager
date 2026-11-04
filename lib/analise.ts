// Constantes e utilitários do módulo "Análise de Competições"

export const GENEROS = ['Feminino', 'Masculino'] as const;
export type Genero = (typeof GENEROS)[number];

export const CATEGORIAS_PESO: Record<Genero, string[]> = {
  Feminino: ['-48kg', '-52kg', '-63kg', '-70kg', '+70kg'],
  Masculino: ['-34kg', '-38kg', '-42kg', '-46kg', '-50kg', '-55kg', '-60kg', '-66kg', '-73kg', '-81kg', '-90kg', '+90kg'],
};

export const RESULTADOS = ['Vitória', 'Derrota'] as const;

export const BUCKET_COMBATES = 'combates';

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
