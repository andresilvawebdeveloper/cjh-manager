'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../../../../lib/supabase/client';

export default function CentrosPage() {
  const [centros, setCentros] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    setMontado(true);
    carregarCentros();
  }, []);

  const carregarCentros = async () => {
    try {
      setLoading(true);
      setErro('');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !user.email) {
        setCentros([]);
        setLoading(false);
        return;
      }

      // 1. Buscar os IDs dos centros onde o email do utilizador tem acesso
      const { data: acessos, error: erroAcessos } = await supabase
        .from('centro_treinadores')
        .select('centro_id')
        .ilike('email', user.email);

      if (erroAcessos) throw erroAcessos;

      const idsCentros = acessos?.map(a => a.centro_id) || [];

      if (idsCentros.length === 0) {
        setCentros([]);
        setLoading(false);
        return;
      }

      // 2. Buscar os dados dos centros correspondentes
      const { data: centrosData, error: centrosErro } = await supabase
        .from('centros')
        .select('*')
        .in('id', idsCentros)
        .order('nome', { ascending: true });

      if (centrosErro) throw centrosErro;
      setCentros(centrosData || []);

    } catch (err: any) {
      console.error('Erro ao carregar centros:', err);
      setErro('Erro ao carregar centros: ' + (err.message || JSON.stringify(err)));
    } finally {
      setLoading(false);
    }
  };

  // Evita problemas de hidratação enquanto o componente não estiver montado no cliente
  if (!montado) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-xs text-gray-500 font-medium">
        A carregar centros...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-6">
      <div>
        <Link href="/dashboard" className="text-xs font-bold text-gray-500 hover:text-blue-600 block mb-2">← Voltar ao Dashboard</Link>
        <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Gestão de Instalações</span>
        <h1 className="text-2xl font-black text-gray-900 mt-1">Centros de Treino</h1>
      </div>

      <div className="flex items-center justify-end">
        <Link
          href="/dashboard/centros/novo"
          className="px-4 py-2.5 bg-blue-950 hover:bg-blue-900 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center gap-2"
        >
          ＋ Adicionar Centro
        </Link>
      </div>

      {erro && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl whitespace-pre-wrap">
          {erro}
        </div>
      )}

      {centros.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-gray-100 shadow-sm space-y-3">
          <p className="text-xs font-bold text-gray-500">Ainda não tem centros associados ou criados.</p>
          <Link
            href="/dashboard/centros/novo"
            className="inline-block px-4 py-2 bg-blue-950 text-white font-bold rounded-xl text-xs"
          >
            Criar o primeiro centro
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {centros.map((centro) => (
            <div key={centro.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full uppercase tracking-wider border border-emerald-100">
                  Acesso Autorizado
                </span>
                <h2 className="text-lg font-black text-gray-900 mt-3">{centro.nome}</h2>
              </div>

              <div className="flex justify-end pt-2 border-t border-gray-50">
                <Link
                  href={`/dashboard/centros/${centro.id}`}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-gray-800 font-bold rounded-xl text-xs transition-all"
                >
                  Ver Turmas e Detalhes →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}