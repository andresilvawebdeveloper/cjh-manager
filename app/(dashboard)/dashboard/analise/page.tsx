'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../../../lib/supabase/client';
import { apagarFicheirosCombates, formatarData } from '../../../../lib/analise';
import DashboardResultados from './DashboardResultados';

interface Competicao {
  id: number;
  nome: string;
  data: string;
  analise_atletas: { count: number }[];
}

export default function AnalisePage() {
  const [competicoes, setCompeticoes] = useState<Competicao[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  const [nome, setNome] = useState('');
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);
  const [atualizacao, setAtualizacao] = useState(0);

  useEffect(() => {
    carregarCompeticoes();
  }, []);

  async function carregarCompeticoes() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('analise_competicoes')
        .select('id, nome, data, analise_atletas(count)')
        .order('data', { ascending: false });
      if (error) throw error;
      setCompeticoes(data || []);
      setAtualizacao((n) => n + 1);
    } catch (err: any) {
      setErro('Erro ao carregar competições: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function adicionarCompeticao(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim() || !data) return;
    setSaving(true);
    setErro('');
    try {
      const { error } = await supabase.from('analise_competicoes').insert([{ nome: nome.trim(), data }]);
      if (error) throw error;
      setNome('');
      carregarCompeticoes();
    } catch (err: any) {
      setErro('Erro ao adicionar competição: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function removerCompeticao(competicao: Competicao) {
    if (!confirm(`Tem a certeza de que deseja remover a competição "${competicao.nome}"? Serão removidos todos os atletas e vídeos de combates associados.`)) return;
    try {
      // Apagar primeiro os vídeos do Storage (a base de dados apaga atletas/combates em cascata)
      const { data: atletas } = await supabase
        .from('analise_atletas')
        .select('id, analise_combates(id, video_path)')
        .eq('competicao_id', competicao.id);
      await apagarFicheirosCombates(supabase, (atletas || []).flatMap((a: any) => a.analise_combates || []));

      const { error } = await supabase.from('analise_competicoes').delete().eq('id', competicao.id);
      if (error) throw error;
      carregarCompeticoes();
    } catch (err: any) {
      alert('Erro ao remover competição: ' + err.message);
    }
  }

  const hoje = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <Link href="/dashboard" className="text-xs font-bold text-gray-500 hover:text-blue-600 block mb-2">← Voltar ao Dashboard</Link>
        <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Análise de Desempenho</span>
        <h1 className="text-2xl font-black text-gray-900 mt-1">Análise de Competições</h1>
      </div>

      {erro && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl">{erro}</div>
      )}

      <DashboardResultados atualizacao={atualizacao} />

      <form onSubmit={adicionarCompeticao} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Nova Competição</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-gray-600 mb-1">Nome da competição</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Campeonato Regional de Cadetes"
              required
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Data</label>
            <input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              required
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md transition-all"
        >
          {saving ? 'A guardar...' : '+ Adicionar Competição'}
        </button>
      </form>

      <section className="space-y-3">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Competições</h2>
        {loading ? (
          <p className="text-xs text-gray-500">A carregar...</p>
        ) : competicoes.length === 0 ? (
          <p className="text-xs text-gray-500 bg-white p-6 rounded-2xl border border-gray-100">Ainda não há competições registadas.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {competicoes.map((c) => {
              const numAtletas = c.analise_atletas?.[0]?.count ?? 0;
              const futura = c.data > hoje;
              return (
                <div key={c.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-md uppercase ${futura ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-700'}`}>
                        {futura ? 'Próxima' : 'Realizada'} · {formatarData(c.data)}
                      </span>
                      <h3 className="text-base font-bold text-gray-900 mt-2">{c.nome}</h3>
                      <p className="text-xs text-gray-500 mt-1">{numAtletas} {numAtletas === 1 ? 'atleta' : 'atletas'}</p>
                    </div>
                    <button
                      onClick={() => removerCompeticao(c)}
                      className="text-xs font-bold text-red-500 hover:text-red-700"
                    >
                      Remover
                    </button>
                  </div>
                  <Link
                    href={`/dashboard/analise/${c.id}`}
                    className="text-center px-4 py-2 bg-slate-900 hover:bg-black text-white font-bold rounded-xl text-xs transition-all"
                  >
                    Abrir competição →
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
