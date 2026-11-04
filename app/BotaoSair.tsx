'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase/client';

/** Termina a sessão neste dispositivo. */
export default function BotaoSair() {
  const router = useRouter();
  const [aSair, setASair] = useState(false);

  async function sair() {
    if (!confirm('Terminar a sessão neste dispositivo?')) return;
    setASair(true);
    await supabase.auth.signOut();
    router.replace('/');
  }

  return (
    <button
      onClick={sair}
      disabled={aSair}
      title="Terminar sessão"
      className="h-10 px-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 flex items-center gap-1.5 disabled:opacity-50"
    >
      ⎋ <span className="hidden sm:inline">Sair</span>
    </button>
  );
}
