// Lembra a última página do painel aberta neste dispositivo, para a app reabrir onde ficou.
const CHAVE = 'ultimo-ecra';

export function guardarUltimoEcra(caminho: string) {
  try {
    if (caminho.startsWith('/dashboard')) localStorage.setItem(CHAVE, caminho);
  } catch {
    // sem armazenamento disponível
  }
}

export function lerUltimoEcra(): string {
  try {
    const c = localStorage.getItem(CHAVE);
    if (c && c.startsWith('/dashboard')) return c;
  } catch {
    // sem armazenamento disponível
  }
  return '/dashboard';
}
