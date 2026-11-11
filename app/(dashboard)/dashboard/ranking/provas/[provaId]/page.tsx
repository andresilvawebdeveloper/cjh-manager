'use client';

import { useEffect, useMemo, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../../../../lib/supabase/client';
import { formatarData } from '../../../../../../lib/analise';
import {
  AtletaRanking,
  CLASSIFICACOES_RANKING,
  Centro,
  ClassificacaoRanking,
  Epoca,
  PONTOS,
  ROTULO_CLASSIFICACAO,
  normalizarNome,
} from '../../../../../../lib/rankingTorneios';

interface LinhaResultado {
  id: number;
  atleta_id: number;
  centro_id: number | null;
  peso: string | null;
  classificacao: ClassificacaoRanking;
  ranking_atletas: { nome: string; ano: number } | null;
}

const NOVO_CENTRO = '__novo__';
const ORDEM: Record<ClassificacaoRanking, number> = { '1º': 0, '2º': 1, '3º': 2, 'Sem pódio': 3 };

export default function ProvaRankingPage({ params }: { params: Promise<{ provaId: string }> }) {
  const { provaId } = use(params);
  const router = useRouter();

  const [prova, setProva] = useState<{ id: number; nome: string; data: string; epoca_id: number } | null>(null);
  const [epoca, setEpoca] = useState<Epoca | null>(null);
  const [centros, setCentros] = useState<Centro[]>([]);
  const [atletasEpoca, setAtletasEpoca] = useState<AtletaRanking[]>([]);
  const [resultados, setResultados] = useState<LinhaResultado[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  const [nome, setNome] = useState('');
  const [centroId, setCentroId] = useState('');
  const [ano, setAno] = useState('');
  const [peso, setPeso] = useState('');
  const [classificacao, setClassificacao] = useState<ClassificacaoRanking>('1º');
  const [aGuardar, setAGuardar] = useState(false);

  useEffect(() => {
    carregar();
  }, [provaId]);

  async function carregar() {
    try {
      setLoading(true);
      const { data: p, error } = await supabase.from('ranking_provas').select('*').eq('id', provaId).single();
      if (error) throw error;
      const [epRes, ceRes, atRes, reRes] = await Promise.all([
        supabase.from('ranking_epocas').select('*').eq('id', p.epoca_id).single(),
        supabase.from('ranking_centros').select('id, nome').order('nome'),
        supabase.from('ranking_atletas').select('id, nome, ano, centro_id').eq('epoca_id', p.epoca_id).order('nome'),
        supabase.from('ranking_resultados').select('id, atleta_id, centro_id, peso, classificacao, ranking_atletas(nome, ano)').eq('prova_id', provaId),
      ]);
      if (epRes.error) throw epRes.error;
      if (reRes.error) throw reRes.error;
      setProva(p);
      setEpoca(epRes.data as Epoca);
      setCentros(ceRes.data || []);
      setAtletasEpoca(atRes.data || []);
      setResultados((reRes.data as any) || []);
    } catch (err: any) {
      setErro('Erro ao carregar a prova: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  const anosEpoca = useMemo(() => [...(epoca?.anos || [])].sort((a, b) => a.ano - b.ano), [epoca]);
  const nomeCentro = (id: number | null) => centros.find((c) => c.id === id)?.nome || 'Sem centro';

  // Ao escrever um nome já usado nesta época, preencher o ano e o centro
  function mudarNome(valor: string) {
    setNome(valor);
    const existente = atletasEpoca.find((a) => a.nome.toLowerCase() === normalizarNome(valor).toLowerCase());
    if (existente) {
      setAno(String(existente.ano));
      if (existente.centro_id) setCentroId(String(existente.centro_id));
    }
  }

  async function mudarCentro(valor: string) {
    if (valor !== NOVO_CENTRO) return setCentroId(valor);
    const novo = prompt('Nome do novo centro (ex: Pião Mágico):');
    if (!novo || !novo.trim()) return;
    const { data, error } = await supabase.from('ranking_centros').insert([{ nome: novo.trim() }]).select('id, nome').single();
    if (error) return alert(error.message.includes('duplicate') ? 'Esse centro já existe.' : 'Erro ao criar centro: ' + error.message);
    setCentros((prev) => [...prev, data].sort((a, b) => a.nome.localeCompare(b.nome)));
    setCentroId(String(data.id));
  }

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    if (!prova) return;
    const nomeLimpo = normalizarNome(nome);
    if (!nomeLimpo || !ano || !centroId) return;
    setAGuardar(true);
    setErro('');
    try {
      // Atleta da época (reaproveitado entre provas)
      let atleta = atletasEpoca.find((a) => a.nome.toLowerCase() === nomeLimpo.toLowerCase() && a.ano === Number(ano));
      if (!atleta) {
        const { data, error } = await supabase
          .from('ranking_atletas')
          .insert([{ epoca_id: prova.epoca_id, nome: nomeLimpo, ano: Number(ano), centro_id: Number(centroId) }])
          .select('id, nome, ano, centro_id')
          .single();
        if (error) throw error;
        atleta = data as AtletaRanking;
        setAtletasEpoca((prev) => [...prev, atleta!]);
      } else if (atleta.centro_id !== Number(centroId)) {
        await supabase.from('ranking_atletas').update({ centro_id: Number(centroId) }).eq('id', atleta.id);
      }

      if (resultados.some((r) => r.atleta_id === atleta!.id)) {
        throw new Error(`${atleta.nome} já está nesta prova.`);
      }
      const { error } = await supabase.from('ranking_resultados').insert([
        { prova_id: prova.id, atleta_id: atleta.id, centro_id: Number(centroId), peso: peso.trim() || null, classificacao },
      ]);
      if (error) throw error;
      setNome('');
      setPeso('');
      carregar();
    } catch (err: any) {
      setErro(err.message);
    } finally {
      setAGuardar(false);
    }
  }

  async function atualizar(r: LinhaResultado, campos: Partial<LinhaResultado>) {
    setResultados((prev) => prev.map((x) => (x.id === r.id ? { ...x, ...campos } : x)));
    const { error } = await supabase.from('ranking_resultados').update(campos).eq('id', r.id);
    if (error) alert('Erro ao guardar: ' + error.message);
  }

  async function remover(r: LinhaResultado) {
    if (!confirm(`Retirar ${r.ranking_atletas?.nome} desta prova?`)) return;
    const { error } = await supabase.from('ranking_resultados').delete().eq('id', r.id);
    if (error) return alert('Erro ao remover: ' + error.message);
    setResultados((prev) => prev.filter((x) => x.id !== r.id));
  }

  async function apagarProva() {
    if (!prova || !confirm(`Apagar a prova "${prova.nome}" e todos os seus resultados? Os pontos saem do ranking.`)) return;
    const { error } = await supabase.from('ranking_provas').delete().eq('id', prova.id);
    if (error) return alert('Erro ao apagar: ' + error.message);
    router.push('/dashboard/ranking');
  }

  if (loading) return <p className="text-xs text-gray-500">A carregar…</p>;
  if (!prova) return <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl">{erro || 'Prova não encontrada.'}</div>;

  const campo = 'w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500';
  const pontosProva = resultados.reduce((t, r) => t + (PONTOS[r.classificacao] || 0), 0);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/dashboard/ranking" className="text-xs font-bold text-gray-500 hover:text-blue-600 block mb-2">← Voltar ao Ranking</Link>
          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Prova · Época {epoca?.nome} · {formatarData(prova.data)}</span>
          <h1 className="text-2xl font-black text-gray-900 mt-1">{prova.nome}</h1>
          <p className="text-xs text-gray-500 mt-1">{resultados.length} atletas · {pontosProva} pontos atribuídos</p>
        </div>
        <button onClick={apagarProva} className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold rounded-xl text-xs">
          🗑️ Apagar prova
        </button>
      </div>

      {erro && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl">{erro}</div>}

      <form onSubmit={adicionar} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
        <h2 className="text-sm font-black text-gray-900 uppercase tracking-wider">Adicionar atleta</h2>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-gray-600 mb-1">Nome do atleta</label>
            <input
              type="text"
              list="atletas-epoca"
              value={nome}
              onChange={(e) => mudarNome(e.target.value)}
              placeholder="Escreva ou escolha"
              required
              className={campo}
            />
            <datalist id="atletas-epoca">
              {atletasEpoca.map((a) => (
                <option key={a.id} value={a.nome}>{`${a.ano} · ${nomeCentro(a.centro_id)}`}</option>
              ))}
            </datalist>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-gray-600 mb-1">Centro</label>
            <select value={centroId} onChange={(e) => mudarCentro(e.target.value)} required className={campo}>
              <option value="">Escolher…</option>
              {centros.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
              <option value={NOVO_CENTRO}>+ Adicionar outro centro…</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Ano</label>
            <select value={ano} onChange={(e) => setAno(e.target.value)} required className={campo}>
              <option value="">Ano…</option>
              {anosEpoca.map((a) => (
                <option key={a.ano} value={a.ano}>{a.ano} · {a.escalao}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Peso <span className="font-normal text-gray-400">(opcional)</span></label>
            <input type="text" value={peso} onChange={(e) => setPeso(e.target.value)} placeholder="ex: -30kg" className={campo} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1">Classificação</label>
          <div className="flex flex-wrap gap-2">
            {CLASSIFICACOES_RANKING.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setClassificacao(c)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                  classificacao === c ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {ROTULO_CLASSIFICACAO[c]}
              </button>
            ))}
          </div>
        </div>
        <button type="submit" disabled={aGuardar} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md">
          {aGuardar ? 'A guardar…' : '+ Adicionar à prova'}
        </button>
      </form>

      {anosEpoca.map((a) => {
        const lista = resultados
          .filter((r) => r.ranking_atletas?.ano === a.ano)
          .sort((x, y) => ORDEM[x.classificacao] - ORDEM[y.classificacao] || (x.ranking_atletas?.nome || '').localeCompare(y.ranking_atletas?.nome || ''));
        if (lista.length === 0) return null;
        return (
          <section key={a.ano} className="space-y-2">
            <h2 className="text-sm font-black text-gray-900 uppercase tracking-wider">{a.ano} · {a.escalao} ({lista.length})</h2>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-100">
              {lista.map((r) => (
                <div key={r.id} className="p-3 flex flex-wrap items-center gap-3 justify-between">
                  <div className="min-w-0">
                    <Link href={`/dashboard/ranking/atletas/${r.atleta_id}`} className="text-sm font-bold text-gray-900 hover:text-blue-600 hover:underline">
                      {r.ranking_atletas?.nome}
                    </Link>
                    <p className="text-xs text-gray-500">{nomeCentro(r.centro_id)}{r.peso ? ` · ${r.peso}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={r.classificacao}
                      onChange={(e) => atualizar(r, { classificacao: e.target.value as ClassificacaoRanking })}
                      className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs font-bold text-gray-900 bg-white"
                    >
                      {CLASSIFICACOES_RANKING.map((c) => (
                        <option key={c} value={c}>{ROTULO_CLASSIFICACAO[c]}</option>
                      ))}
                    </select>
                    <span className="w-12 text-right text-sm font-black text-blue-700">{PONTOS[r.classificacao]} {PONTOS[r.classificacao] === 1 ? 'pt' : 'pts'}</span>
                    <button onClick={() => remover(r)} className="text-xs font-bold text-red-500 hover:text-red-700 px-1" title="Retirar da prova">
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}

      {resultados.length === 0 && (
        <p className="text-xs text-gray-500 bg-white p-6 rounded-2xl border border-gray-100 text-center">Ainda não há atletas nesta prova.</p>
      )}
    </div>
  );
}
