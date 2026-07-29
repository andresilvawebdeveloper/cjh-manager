'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase/client';

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verificarSessao = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/');
      } else {
        setLoading(false);
      }
    };
    verificarSessao();
  }, [router]);

  if (loading) {
    return <div className="min-h-screen bg-blue-950 flex items-center justify-center text-white text-xs">A verificar sessão...</div>;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6">
      {/* Cabeçalho de Boas-Vindas com o botão Área do Treinador */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <img src="/logo-clube.png" alt="Logo do Clube de Judo Hajime" className="h-14 w-auto object-contain" />
          <div>
            <h1 className="text-2xl font-black text-gray-900">Painel do Treinador</h1>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Gestão da Época 2026/2027</p>
          </div>
        </div>

        <Link
          href="/dashboard/perfil"
          className="px-4 py-2.5 bg-slate-900 hover:bg-black text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center gap-2"
        >
          🥋 Área do Treinador
        </Link>
      </div>

      {/* Grelha de Acessos Rápidos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link 
          href="/dashboard/centros"
          className="p-6 bg-white hover:bg-blue-50/50 border border-gray-100 rounded-2xl shadow-sm transition-all group flex flex-col justify-between space-y-4"
        >
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 font-bold group-hover:bg-blue-600 group-hover:text-white transition-all">
            📍
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">Centros e Turmas</h2>
            <p className="text-xs text-gray-500 mt-1">Gerir pavilhões, polos de treino e as respetivas turmas.</p>
          </div>
        </Link>

        <Link 
          href="/dashboard/eventos"
          className="p-6 bg-white hover:bg-blue-50/50 border border-gray-100 rounded-2xl shadow-sm transition-all group flex flex-col justify-between space-y-4"
        >
          <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 font-bold group-hover:bg-amber-600 group-hover:text-white transition-all">
            🏆
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">Eventos e Torneios</h2>
            <p className="text-xs text-gray-500 mt-1">Gerir torneios, estágios, presenças de atletas e sistema de pontos.</p>
          </div>
        </Link>
      </div>
    </div>
  );
}