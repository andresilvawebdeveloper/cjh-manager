'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../../../lib/supabase/client';

export default function NovoCentroPage() {
  const router = useRouter();
  const [nome, setNome] = useState('');
  const [publico, setPublico] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  const criarCentro = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErro('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilizador não autenticado.');

      const { error } = await supabase.from('centros').insert([
        {
          nome,
          publico,
          treinador_id: user.id,
        }
      ]);

      if (error) throw error;

      router.push('/dashboard/centros');
      router.refresh();
    } catch (err: any) {
      setErro('Erro ao criar centro: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded-2xl shadow-sm border border-gray-100 space-y-6">
      <div>
        <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Gestão de Instalações</span>
        <h1 className="text-2xl font-black text-gray-900 mt-1">Adicionar Novo Centro</h1>
      </div>

      {erro && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl">
          {erro}
        </div>
      )}

      <form onSubmit={criarCentro} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nome do Centro / Pavilhão</label>
          <input
            type="text"
            required
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: Pavilhão Municipal"
            className="w-full p-3 text-xs border border-gray-300 rounded-xl focus:ring-blue-500 bg-white text-gray-900"
          />
        </div>

        <div className="flex items-center space-x-3 p-4 bg-slate-50 rounded-xl border border-gray-200">
          <input
            type="checkbox"
            id="publico"
            checked={publico}
            onChange={(e) => setPublico(e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
          />
          <label htmlFor="publico" className="text-xs font-bold text-gray-900 cursor-pointer">
            Tornar este centro Público (visível para todos os treinadores do clube)
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-3 bg-blue-950 hover:bg-blue-900 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? 'A guardar...' : '💾 Guardar Centro'}
          </button>
        </div>
      </form>
    </div>
  );
}