'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../../../lib/supabase/client';

interface Centro {
  id: number;
  nome: string;
}

interface Turma {
  id: number;
  nome: string;
  centro_id: number;
  centros: { nome: string } | { nome: string }[] | null;
}

export default function CentrosTurmasPage() {
  const [centros, setCentros] = useState<Centro[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [loading, setLoading] = useState(true);
  const [erroMsg, setErroMsg] = useState<string | null>(null);

  const carregarDados = async () => {
    try {
      setLoading(true);
      setErroMsg(null);

      // 1. Carregar Centros
      const { data: centrosData, error: centrosError } = await supabase
        .from('centros')
        .select('*')
        .order('nome', { ascending: true });

      if (centrosError) throw centrosError;
      setCentros(centrosData || []);

      // 2. Carregar Turmas
      const { data: turmasData, error: turmasError } = await supabase
        .from('turmas')
        .select(`
          id,
          nome,
          centro_id,
          centros ( nome )
        `)
        .order('nome', { ascending: true });

      if (turmasError) throw turmasError;
      setTurmas((turmasData as any) || []);

    } catch (err: any) {
      console.error('Erro detalhado ao carregar dados:', err);
      setErroMsg(err.message || 'Erro desconhecido ao carregar dados.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  if (loading) {
    return (
      <div className="p-12 text-center">
        <p className="text-xs font-bold text-gray-500 animate-pulse">A carregar centros e turmas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* Botão para voltar para trás */}
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-blue-600 bg-white border border-gray-200 px-3 py-2 rounded-xl shadow-xs transition-all hover:border-blue-200"
        >
          ← Voltar ao Dashboard
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Gestão Global</span>
          <h1 className="text-2xl font-black text-gray-900 mt-1">Centros e Turmas</h1>
        </div>
      </div>

      {erroMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs font-semibold">
          ⚠️ Erro ao comunicar com a base de dados: {erroMsg}
        </div>
      )}

      <div className="space-y-6">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Turmas Registadas</h2>

        {turmas.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-gray-100 text-center">
            <p className="text-xs text-gray-400 italic">Não existem turmas registadas ou a base de dados está vazia.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {turmas.map((turma) => {
              const centroObj = Array.isArray(turma.centros) ? turma.centros[0] : turma.centros;
              const nomeCentro = centroObj?.nome || 'Centro não atribuído';
              
              return (
                <div key={turma.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4">
                  <div>
                    <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wider bg-blue-50 px-2.5 py-1 rounded-md">
                      {nomeCentro}
                    </span>
                    <h3 className="text-base font-bold text-gray-900 mt-2">{turma.nome}</h3>
                  </div>

                  <div className="pt-2 border-t border-gray-50 flex items-center justify-between">
                    <Link
                      href={`/dashboard/turmas/${turma.id}`}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      Gerir Presenças / Mapa →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}