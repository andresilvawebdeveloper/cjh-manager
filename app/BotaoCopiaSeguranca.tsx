'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase/client';
import { eAdmin } from '../lib/admin';
import { criarCopiaSeguranca } from '../lib/copiaSeguranca';

/** Botão de cópia de segurança, visível apenas para as contas de administrador. */
export default function BotaoCopiaSeguranca() {
  const [visivel, setVisivel] = useState(false);
  const [estado, setEstado] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setVisivel(eAdmin(data.user?.email)));
  }, []);

  if (!visivel) return null;

  async function copiar() {
    try {
      setEstado('A preparar…');
      const resumo = await criarCopiaSeguranca(setEstado);
      const falhas = resumo.filter((r) => r[2] !== 'OK');
      setEstado('');
      if (falhas.length > 0) {
        alert(`Cópia descarregada.\n\nTabelas não copiadas:\n${falhas.map((f) => `• ${f[0]}: ${f[2]}`).join('\n')}`);
      }
    } catch (err: any) {
      setEstado('');
      alert('Erro na cópia de segurança: ' + err.message);
    }
  }

  return (
    <button
      onClick={copiar}
      disabled={!!estado}
      title="Descarregar todos os dados num ficheiro Excel"
      className="px-4 py-2.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-900 font-bold rounded-xl text-xs shadow-sm transition-all cursor-pointer flex items-center gap-2 disabled:opacity-60"
    >
      💾 {estado || 'Cópia de segurança'}
    </button>
  );
}
