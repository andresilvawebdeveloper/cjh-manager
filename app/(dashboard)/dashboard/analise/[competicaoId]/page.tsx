'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { supabase } from '../../../../../lib/supabase/client';
import { BUCKET_COMBATES, CATEGORIAS_PESO, GENEROS, Genero, formatarData } from '../../../../../lib/analise';

interface Atleta {
  id: number;
  nome: string;
  genero: Genero;
  categoria: string;
  aluno_id: number | null;
  analise_combates: { id: number; resultado: string | null; video_path: string }[];
}

export default function CompeticaoPage({ params }: { params: Promise<{ competicaoId: string }> }) {
  const { competicaoId } = use(params);

  const [competicao, setCompeticao] = useState<any>(null);
  const [atletas, setAtletas] = useState<Atleta[]>([]);
  const [alunosClube, setAlunosClube] = useState<{ id: number; nome: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  const [nome, setNome] = useState('');
  const [genero, setGenero] = useState<Genero>('Masculino');
  const [categoria, setCategoria] = useState(CATEGORIAS_PESO.Masculino[0]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    carregarDados();
  }, [competicaoId]);

  async function carregarDados() {
    try {
      setLoading(true);
      const [compRes, atletasRes, alunosRes] = await Promise.all([
        supabase.from('analise_competicoes').select('*').eq('id', competicaoId).single(),
        supabase
          .from('analise_atletas')
          .select('id, nome, genero, categoria, aluno_id, analise_combates(id, resultado, video_path)')
          .eq('competicao_id', competicaoId)
          .order('genero')
          .order('nome'),
        supabase.from('alunos').select('id, nome').order('nome'),
      ]);
      if (compRes.error) throw compRes.error;
      if (atletasRes.error) throw atletasRes.error;
      setCompeticao(compRes.data);
      setAtletas((atletasRes.data as Atleta[]) || []);
      setAlunosClube(alunosRes.data || []);
    } catch (err: any) {
      setErro('Erro ao carregar competição: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  function mudarGenero(novo: Genero) {
    setGenero(novo);
    setCategoria(CATEGORIAS_PESO[novo][0]);
  }

  async function adicionarAtleta(e: React.FormEvent) {
    e.preventDefault();
    const nomeLimpo = nome.trim();
    if (!nomeLimpo) return;
    setSaving(true);
    setErro('');
    try {
      // Se o nome corresponder a um atleta do clube, fica ligado à ficha dele
      const aluno = alunosClube.find((a) => a.nome?.trim().toLowerCase() === nomeLimpo.toLowerCase());
      const { error } = await supabase.from('analise_atletas').insert([
        {
          competicao_id: Number(competicaoId),
          aluno_id: aluno?.id ?? null,
          nome: aluno?.nome ?? nomeLimpo,
          genero,
          categoria,
        },
      ]);
      if (error) throw error;
      setNome('');
      carregarDados();
    } catch (err: any) {
      setErro('Erro ao adicionar atleta: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function atualizarCategoria(atleta: Atleta, novaCategoria: string) {
    const { error } = await supabase.from('analise_atletas').update({ categoria: novaCategoria }).eq('id', atleta.id);
    if (error) return alert('Erro ao atualizar categoria: ' + error.message);
    setAtletas((prev) => prev.map((a) => (a.id === atleta.id ? { ...a, categoria: novaCategoria } : a)));
  }

  async function removerAtleta(atleta: Atleta) {
    if (!confirm(`Remover "${atleta.nome}" desta competição? Os vídeos dos combates também serão apagados.`)) return;
    try {
      const caminhos = atleta.analise_combates.map((c) => c.video_path);
      if (caminhos.length > 0) await supabase.storage.from(BUCKET_COMBATES).remove(caminhos);
      const { error } = await supabase.from('analise_atletas').delete().eq('id', atleta.id);
      if (error) throw error;
      carregarDados();
    } catch (err: any) {
      alert('Erro ao remover atleta: ' + err.message);
    }
  }

  if (loading) return <p className="text-xs text-gray-500">A carregar...</p>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <Link href="/dashboard/analise" className="text-xs font-bold text-gray-500 hover:text-blue-600 block mb-2">← Voltar às Competições</Link>
        <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Competição · {formatarData(competicao?.data)}</span>
        <h1 className="text-2xl font-black text-gray-900 mt-1">{competicao?.nome}</h1>
      </div>

      {erro && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl">{erro}</div>
      )}

      <form onSubmit={adicionarAtleta} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Adicionar Atleta</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-gray-600 mb-1">Nome do atleta</label>
            <input
              type="text"
              list="lista-alunos-clube"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Escreva ou escolha um atleta do clube"
              required
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <datalist id="lista-alunos-clube">
              {alunosClube.map((a) => (
                <option key={a.id} value={a.nome} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Género</label>
            <div className="flex gap-2">
              {GENEROS.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => mudarGenero(g)}
                  className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                    genero === g ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Categoria</label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {CATEGORIAS_PESO[genero].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md transition-all"
        >
          {saving ? 'A guardar...' : '+ Adicionar Atleta'}
        </button>
      </form>

      {GENEROS.map((g) => {
        const lista = atletas.filter((a) => a.genero === g);
        if (lista.length === 0) return null;
        return (
          <section key={g} className="space-y-3">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">{g} ({lista.length})</h2>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-100">
              {lista.map((a) => {
                const vitorias = a.analise_combates.filter((c) => c.resultado === 'Vitória').length;
                const derrotas = a.analise_combates.filter((c) => c.resultado === 'Derrota').length;
                return (
                  <div key={a.id} className="p-4 flex flex-wrap items-center gap-3 justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900">{a.nome}</p>
                      <p className="text-xs text-gray-500">
                        {a.analise_combates.length} {a.analise_combates.length === 1 ? 'combate' : 'combates'}
                        {a.analise_combates.length > 0 && ` · ${vitorias}V / ${derrotas}D`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <select
                        value={a.categoria}
                        onChange={(e) => atualizarCategoria(a, e.target.value)}
                        className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs font-bold text-gray-900 bg-white"
                      >
                        {CATEGORIAS_PESO[a.genero].map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                      <Link
                        href={`/dashboard/analise/${competicaoId}/atletas/${a.id}`}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white font-bold rounded-lg text-xs"
                      >
                        Combates →
                      </Link>
                      <button onClick={() => removerAtleta(a)} className="text-xs font-bold text-red-500 hover:text-red-700">
                        Remover
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {atletas.length === 0 && (
        <p className="text-xs text-gray-500 bg-white p-6 rounded-2xl border border-gray-100">Ainda não há atletas nesta competição.</p>
      )}
    </div>
  );
}
