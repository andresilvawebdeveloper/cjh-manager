'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { guardarUltimoEcra } from '../lib/ultimoEcra';

export default function LembrarUltimoEcra() {
  const caminho = usePathname();
  useEffect(() => {
    if (caminho) guardarUltimoEcra(caminho);
  }, [caminho]);
  return null;
}
