'use client';

import { useEffect, useState } from 'react';

/** Botão para alternar entre modo claro e escuro (guardado neste dispositivo). */
export default function TemaToggle() {
  const [escuro, setEscuro] = useState<boolean | null>(null);

  useEffect(() => {
    setEscuro(document.documentElement.classList.contains('dark'));
  }, []);

  function alternar() {
    const novo = !escuro;
    setEscuro(novo);
    document.documentElement.classList.toggle('dark', novo);
    try {
      localStorage.setItem('tema', novo ? 'escuro' : 'claro');
    } catch {
      // sem armazenamento disponível: o tema só dura esta visita
    }
  }

  return (
    <button
      onClick={alternar}
      aria-label={escuro ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
      title={escuro ? 'Modo claro' : 'Modo escuro'}
      className="w-10 h-10 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center text-lg transition-all"
    >
      {/* Antes de montar não sabemos o tema: evitar mostrar o ícone errado */}
      {escuro === null ? '' : escuro ? '☀️' : '🌙'}
    </button>
  );
}
