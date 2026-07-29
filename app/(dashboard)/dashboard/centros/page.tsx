'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../../lib/supabase/client';

export default function CentrosPage() {
  const router = useRouter();
  const [centros, setCentros] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [nome, setNome] = useState('');
  const [publico, setPublico] = useState(false);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState('');
  const [mostrarForm, setMostrarForm] = useState(false);

  useEffect(() => {
    carregarCentros();
  }, []);

  const carregarCentros = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('centros')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCentros(data || []);
    } catch (err: any) {
      console.error('Erro ao carregar centros:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const criarCentro = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
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

      setNome('');
      setPublico(false);
      setMostrarForm(false);
      carregarCentros();
    } catch (err: any) {
      setErro('Erro ao adicionar centro: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const acederDetalhesCentro = (centroId: number) => {
    // Redireciona para a página específica do centro usando o ID do centro
    router.push(`/dashboard/centros/${centroId}`);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/dashboard" className="text-xs font-bold text-gray-500 hover:text-blue-600 block mb-2">← Voltar ao Dashboard</Link>
          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Gestão de Instalações</span>
          <h1 className="text-2xl font-black text-gray-900 mt-1">Centros e Turmas</h1>
        </div>

        <button
          onClick={() => setMostrarForm(!mostrarForm)}
          className="px-4 py-2.5 bg-blue-950 hover:bg-blue-900 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center gap-2"
        >
          {mostrarForm ? '✕ Fechar Formulário' : '＋ Adicionar Novo Centro'}
        </button>
      </div>

      {mostrarForm && (
        <div className="bg-white p-6 rounded-2xl border border-blue-900/10 shadow-lg space-y-4 transition-all">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Registar Novo Centro</h2>

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
                className="w-full p-3 text-xs border border-gray-300 rounded-xl focus:ring-blue-900 bg-white text-gray-900"
              />
            </div>

            <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-xl border border-gray-200">
              <input
                type="checkbox"
                id="publico"
                checked={publico}
                onChange={(e) => setPublico(e.target.checked)}
                className="w-4 h-4 text-blue-950 border-gray-300 rounded focus:ring-blue-950 cursor-pointer"
              />
              <label htmlFor="publico" className="text-xs font-bold text-gray-900 cursor-pointer">
                Tornar este centro Público (visível para todos os treinadores do clube)
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMostrarForm(false)}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-blue-950 hover:bg-blue-900 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {saving ? 'A guardar...' : '💾 Guardar Centro'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-slate-50/50">
          <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Centros Disponíveis</h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-gray-500">A carregar centros...</div>
        ) : centros.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-500">Ainda não existem centros registados. Clique no botão acima para adicionar.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {centros.map((centro) => (
              <div 
                key={centro.id} 
                onClick={() => acederDetalhesCentro(centro.id)}
                className="p-4 flex items-center justify-between hover:bg-blue-50/50 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <span className="font-bold text-gray-900 text-sm group-hover:text-blue-600 transition-colors">{centro.nome}</span>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${centro.publico ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                    {centro.publico ? 'Público' : 'Privado'}
                  </span>
                </div>
                <span className="text-xs text-gray-400 group-hover:text-blue-600 font-bold transition-colors">Ver Centro →</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}