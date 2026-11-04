'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { guardarUltimoEcra, lerUltimoEcra } from '../lib/ultimoEcra';

const CHAVE_ABERTURA = 'app-aberta';

/** A app está a correr instalada (aberta pelo ícone), e não num separador do browser? */
function emModoApp() {
  try {
    return window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
  } catch {
    return false;
  }
}

/**
 * Guarda a página atual do painel e, quando a app instalada é aberta pelo ícone,
 * leva o treinador de volta ao último ecrã usado — mesmo que o atalho do ícone
 * aponte para outra página (acontece se o ícone foi criado numa página do painel).
 */
export default function LembrarUltimoEcra() {
  const caminho = usePathname();
  const router = useRouter();
  const aRedirecionar = useRef(false);

  // Só na primeira página desta abertura da app (o sessionStorage é limpo quando a app fecha)
  useEffect(() => {
    try {
      if (!emModoApp() || sessionStorage.getItem(CHAVE_ABERTURA)) return;
      sessionStorage.setItem(CHAVE_ABERTURA, '1');
      const ultimo = lerUltimoEcra();
      if (ultimo !== window.location.pathname) {
        aRedirecionar.current = true;
        router.replace(ultimo);
      }
    } catch {
      // sem armazenamento: abre onde o ícone mandar
    }
  }, [router]);

  useEffect(() => {
    if (!caminho) return;
    // Não gravar a página de entrada do ícone enquanto a app volta ao último ecrã
    if (aRedirecionar.current) {
      if (caminho === lerUltimoEcra()) aRedirecionar.current = false;
      return;
    }
    guardarUltimoEcra(caminho);
  }, [caminho]);

  return null;
}
