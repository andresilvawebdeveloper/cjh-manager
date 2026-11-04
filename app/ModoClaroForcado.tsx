'use client';

import { useEffect } from 'react';

/** Documentos para ler/imprimir: mostra-os sempre em modo claro. */
export default function ModoClaroForcado() {
  useEffect(() => {
    const html = document.documentElement;
    const estavaEscuro = html.classList.contains('dark');
    html.classList.remove('dark');
    return () => {
      if (estavaEscuro) html.classList.add('dark');
    };
  }, []);
  return null;
}
