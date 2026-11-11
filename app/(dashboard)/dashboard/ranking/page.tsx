'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx-js-style';
import { supabase } from '../../../../lib/supabase/client';
import { lerTudo } from '../../../../lib/supabase/utils';
import { formatarData } from '../../../../lib/analise';
import {
  AtletaRanking,
  Centro,
  Epoca,
  Resultado,
  calcularRanking,
  proximaEpoca,
} from '../../../../lib/rankingTorneios';

const CHAVE_EPOCA = 'ranking-epoca';

const MEDALHA = (posicao: number) => (posicao === 1 ? '🥇' : posicao === 2 ? '🥈' : posicao === 3 ? '🥉' : '');

export default function RankingTorneiosPage() {
  const [epocas, setEpocas] = useState<Epoca[]>([]);
  const [epocaId, setEpocaId] = useState<number | null>(null);
  const [centros, setCentros] = useState<Centro[]>([]);
  const [provas, setProvas] = useState<{ id: number; nome: string; data: string }[]>([]);
  const [atletas, setAtletas] = useState<AtletaRanking[]>([]);
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [ano, setAno] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  const [nomeProva, setNomeProva] = useState('');
  const [dataProva, setDataProva] = useState(new Date().toISOString().split('T')[0]);
  const [aGuardar, setAGuardar] = useState(false);

  useEffect(() => {
    carregarBase();
  }, []);

  useEffect(() => {
    if (epocaId) carregarEpoca(epocaId);
  }, [epocaId]);

  async function carregarBase() {
    try {
      setLoading(true);
      const [epRes, ceRes] = await Promise.all([
        supabase.from('ranking_epocas').select('*').order('nome', { ascending: false }),
        supabase.from('ranking_centros').select('id, nome').order('nome'),
      ]);
      if (epRes.error) {
        throw new Error(
          epRes.error.message.includes('ranking_epocas')
            ? 'As tabelas do ranking ainda não existem. Corra a migração 20261111_ranking_torneios.sql no Supabase.'
            : epRes.error.message
        );
      }
      const lista = (epRes.data || []) as Epoca[];
      setEpocas(lista);
      setCentros(ceRes.data || []);
      let guardada: number | null = null;
      try {
        guardada = Number(localStorage.getItem(CHAVE_EPOCA)) || null;
      } catch {
        // sem armazenamento
      }
      setEpocaId(lista.find((e) => e.id === guardada)?.id ?? lista[0]?.id ?? null);
      if (lista.length === 0) setLoading(false);
    } catch (err: any) {
      setErro(err.message);
      setLoading(false);
    }
  }

  async function carregarEpoca(id: number) {
    try {
      setLoading(true);
      setErro('');
      const [prRes, at] = await Promise.all([
        supabase.from('ranking_provas').select('id, nome, data').eq('epoca_id', id).order('data', { ascending: false }),
        lerTudo<AtletaRanking>((de, ate) =>
          supabase.from('ranking_atletas').select('id, nome, ano, centro_id').eq('epoca_id', id).order('id').range(de, ate)
        ),
      ]);
      if (prRes.error) throw prRes.error;
      const listaProvas = prRes.data || [];
      const ids = listaProvas.map((p) => p.id);
      const res = ids.length
        ? await lerTudo<Resultado>((de, ate) =>
            supabase.from('ranking_resultados').select('*').in('prova_id', ids).order('id').range(de, ate)
          )
        : [];
      setProvas(listaProvas);
      setAtletas(at);
      setResultados(res);
    } catch (err: any) {
      setErro('Erro ao carregar o ranking: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  function escolherEpoca(id: number) {
    setEpocaId(id);
    setAno(null);
    try {
      localStorage.setItem(CHAVE_EPOCA, String(id));
    } catch {
      // sem armazenamento
    }
  }

  async function novaEpoca() {
    const base = epocas[0];
    if (!base) return;
    const nova = proximaEpoca(base);
    const anosTexto = nova.anos.map((a) => `${a.escalao} ${a.ano}`).join(', ');
    if (!confirm(`Criar a época ${nova.nome}?\n\nAnos de nascimento: ${anosTexto}\n\nO ranking começa do zero; a época atual fica guardada.`)) return;
    const { data, error } = await supabase.from('ranking_epocas').insert([nova]).select().single();
    if (error) return alert('Erro ao criar época: ' + error.message);
    setEpocas((prev) => [data as Epoca, ...prev]);
    escolherEpoca(data.id);
  }

  async function criarProva(e: React.FormEvent) {
    e.preventDefault();
    if (!epocaId || !nomeProva.trim()) return;
    setAGuardar(true);
    const { error } = await supabase.from('ranking_provas').insert([{ epoca_id: epocaId, nome: nomeProva.trim(), data: dataProva }]);
    setAGuardar(false);
    if (error) return alert('Erro ao criar prova: ' + error.message);
    setNomeProva('');
    carregarEpoca(epocaId);
  }

  const epoca = epocas.find((e) => e.id === epocaId) || null;
  const anosEpoca = useMemo(() => [...(epoca?.anos || [])].sort((a, b) => a.ano - b.ano), [epoca]);
  const nomeCentro = (id: number | null) => centros.find((c) => c.id === id)?.nome || 'Sem centro';
  const escalaoDoAno = (a: number) => anosEpoca.find((x) => x.ano === a)?.escalao || '';

  const provasPorData = useMemo(() => new Map(provas.map((p) => [p.id, p.data])), [provas]);
  const tabela = useMemo(() => calcularRanking(atletas, resultados, provasPorData, ano), [atletas, resultados, provasPorData, ano]);
  const atletasPorProva = useMemo(() => {
    const m = new Map<number, number>();
    resultados.forEach((r) => m.set(r.prova_id, (m.get(r.prova_id) || 0) + 1));
    return m;
  }, [resultados]);

  function exportarExcel() {
    const filtro = ano ? `${ano} (${escalaoDoAno(ano)})` : 'Todos os anos';
    const cab = { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '1F4E78' } }, alignment: { horizontal: 'center' } };
    const folha = (linhas: (string | number)[][], larguras: number[]) => {
      const ws = XLSX.utils.aoa_to_sheet(linhas);
      linhas[2]?.forEach((_, c) => {
        const ref = XLSX.utils.encode_cell({ r: 2, c });
        if (ws[ref]) ws[ref].s = cab;
      });
      if (ws['A1']) ws['A1'].s = { font: { bold: true, sz: 14 } };
      ws['!cols'] = larguras.map((wch) => ({ wch }));
      return ws;
    };
    const titulo = `Ranking ${epoca?.nome || ''} — ${filtro}`;
    const wsAtletas = folha(
      [
        [titulo],
        [],
        ['Posição', 'Atleta', 'Ano', 'Centro', '1.º', '2.º', '3.º', 'Provas', 'Pontos'],
        ...tabela.atletas.map((l) => [l.posicao, l.atleta.nome, l.atleta.ano, nomeCentro(l.centroId), l.ouro, l.prata, l.bronze, l.provas, l.pontos]),
      ],
      [9, 30, 7, 24, 6, 6, 6, 8, 8]
    );
    const wsCentros = folha(
      [
        [`Competição entre centros ${epoca?.nome || ''} — ${filtro}`],
        [],
        ['Posição', 'Centro', ...anosEpoca.map((a) => String(a.ano)), '1.º', '2.º', '3.º', 'Atletas', 'Pontos'],
        ...tabela.centros.map((c) => [
          c.posicao,
          nomeCentro(c.centroId),
          ...anosEpoca.map((a) => c.pontosPorAno[a.ano] || 0),
          c.ouro,
          c.prata,
          c.bronze,
          c.atletas,
          c.pontos,
        ]),
      ],
      [9, 26, ...anosEpoca.map(() => 7), 6, 6, 6, 8, 8]
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsAtletas, 'Atletas');
    XLSX.utils.book_append_sheet(wb, wsCentros, 'Centros');
    XLSX.writeFile(wb, `ranking_${(epoca?.nome || '').replace('/', '-')}_${ano || 'todos'}.xlsx`);
  }

  const lider = tabela.centros[0];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/dashboard" className="text-xs font-bold text-gray-500 hover:text-blue-600 block mb-2">← Voltar ao Dashboard</Link>
          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Torneios</span>
          <h1 className="text-2xl font-black text-gray-900 mt-1">Ranking</h1>
          <p className="text-xs text-gray-500 mt-1">1.º lugar = 5 pts · 2.º lugar = 3 pts · 3.º lugar = 1 pt</p>
        </div>
        {epocas.length > 0 && (
          <div className="flex items-center gap-2">
            <select
              value={epocaId ?? ''}
              onChange={(e) => escolherEpoca(Number(e.target.value))}
              className="px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 bg-white"
            >
              {epocas.map((e) => (
                <option key={e.id} value={e.id}>Época {e.nome}</option>
              ))}
            </select>
            <button onClick={novaEpoca} className="px-3 py-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-bold rounded-xl text-xs">
              + Nova época
            </button>
          </div>
        )}
      </div>

      {erro && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl">{erro}</div>}

      {epoca && (
        <>
          {/* Filtro por ano de nascimento */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setAno(null)}
              className={`px-4 py-2 rounded-xl text-xs font-bold border ${ano === null ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
            >
              Todos os anos
            </button>
            {anosEpoca.map((a) => (
              <button
                key={a.ano}
                onClick={() => setAno(a.ano)}
                className={`px-4 py-2 rounded-xl text-xs font-bold border ${ano === a.ano ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
              >
                {a.ano} <span className="opacity-70 font-medium">· {a.escalao}</span>
              </button>
            ))}
            <button
              onClick={exportarExcel}
              disabled={tabela.atletas.length === 0}
              className="ml-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs disabled:opacity-50"
            >
              📊 Exportar Excel
            </button>
          </div>

          {loading ? (
            <p className="text-xs text-gray-500">A carregar…</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Ranking de atletas */}
              <section className="lg:col-span-3 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <h2 className="text-sm font-black text-gray-900 uppercase tracking-wider">
                  🏆 Atletas — {ano ? `${ano} (${escalaoDoAno(ano)})` : 'Todos os anos'}
                </h2>
                {tabela.atletas.length === 0 ? (
                  <p className="text-xs text-gray-500 py-6 text-center">Ainda não há resultados {ano ? `de atletas de ${ano}` : 'nesta época'}.</p>
                ) : (
                  <div className="overflow-x-auto -mx-6 px-6">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-[10px] font-bold text-gray-500 uppercase border-b border-gray-100">
                          <th className="py-2 pr-2 w-10">#</th>
                          <th className="py-2 px-2">Atleta</th>
                          <th className="py-2 px-2">Centro</th>
                          <th className="py-2 px-1 text-center hidden sm:table-cell">🥇</th>
                          <th className="py-2 px-1 text-center hidden sm:table-cell">🥈</th>
                          <th className="py-2 px-1 text-center hidden sm:table-cell">🥉</th>
                          <th className="py-2 px-2 text-center hidden sm:table-cell">Provas</th>
                          <th className="py-2 pl-2 text-right">Pontos</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {tabela.atletas.map((l) => (
                          <tr key={l.atleta.id} className={l.posicao <= 3 ? 'bg-yellow-50/40' : ''}>
                            <td className="py-2.5 pr-2 font-black text-gray-900">{MEDALHA(l.posicao) || `${l.posicao}.º`}</td>
                            <td className="py-2.5 px-2">
                              <Link href={`/dashboard/ranking/atletas/${l.atleta.id}`} className="font-bold text-gray-900 hover:text-blue-600 hover:underline">
                                {l.atleta.nome}
                              </Link>
                              {ano === null && <span className="text-[10px] text-gray-400 ml-1.5">{l.atleta.ano}</span>}
                              <span className="block sm:hidden text-[10px] text-gray-500 mt-0.5">
                                {[l.ouro && `🥇${l.ouro}`, l.prata && `🥈${l.prata}`, l.bronze && `🥉${l.bronze}`].filter(Boolean).join(' ') || '—'} · {l.provas} {l.provas === 1 ? 'prova' : 'provas'}
                              </span>
                            </td>
                            <td className="py-2.5 px-2 text-gray-600">{nomeCentro(l.centroId)}</td>
                            <td className="py-2.5 px-1 text-center text-gray-700 hidden sm:table-cell">{l.ouro || '—'}</td>
                            <td className="py-2.5 px-1 text-center text-gray-700 hidden sm:table-cell">{l.prata || '—'}</td>
                            <td className="py-2.5 px-1 text-center text-gray-700 hidden sm:table-cell">{l.bronze || '—'}</td>
                            <td className="py-2.5 px-2 text-center text-gray-500 hidden sm:table-cell">{l.provas}</td>
                            <td className="py-2.5 pl-2 text-right text-base font-black text-blue-700">{l.pontos}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {/* Competição entre centros */}
              <section className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <h2 className="text-sm font-black text-gray-900 uppercase tracking-wider">
                  🏟️ Centros — {ano ? ano : 'Todos os anos'}
                </h2>
                {lider && lider.pontos > 0 && (
                  <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-yellow-100 border border-yellow-300 p-4 text-center">
                    <p className="text-3xl">🏆</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800 mt-1">
                      {tabela.centros.filter((c) => c.posicao === 1).length > 1 ? 'Empatados na liderança' : 'A liderar'}
                    </p>
                    <p className="text-lg font-black text-gray-900">
                      {tabela.centros.filter((c) => c.posicao === 1).map((c) => nomeCentro(c.centroId)).join(' · ')}
                    </p>
                    <p className="text-xs text-amber-800 font-bold">{lider.pontos} pontos</p>
                  </div>
                )}
                {tabela.centros.length === 0 ? (
                  <p className="text-xs text-gray-500 py-6 text-center">Sem pontos ainda.</p>
                ) : (
                  <div className="overflow-x-auto -mx-6 px-6">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-[10px] font-bold text-gray-500 uppercase border-b border-gray-100">
                          <th className="py-2 pr-2 w-10">#</th>
                          <th className="py-2 px-2">Centro</th>
                          {ano === null && anosEpoca.map((a) => (
                            <th key={a.ano} className="py-2 px-1 text-center hidden sm:table-cell">{a.ano}</th>
                          ))}
                          <th className="py-2 px-1 text-center hidden sm:table-cell" title="Medalhas">🥇🥈🥉</th>
                          <th className="py-2 pl-2 text-right">Pontos</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {tabela.centros.map((c) => (
                          <tr key={String(c.centroId)}>
                            <td className="py-2.5 pr-2 font-black text-gray-900">{MEDALHA(c.posicao) || `${c.posicao}.º`}</td>
                            <td className="py-2.5 px-2">
                              <span className="font-bold text-gray-900">{nomeCentro(c.centroId)}</span>
                              <span className="block text-[10px] text-gray-400">
                                {c.atletas} {c.atletas === 1 ? 'atleta' : 'atletas'}
                                <span className="sm:hidden"> · 🥇{c.ouro} 🥈{c.prata} 🥉{c.bronze}</span>
                              </span>
                            </td>
                            {ano === null && anosEpoca.map((a) => (
                              <td key={a.ano} className="py-2.5 px-1 text-center text-gray-600 hidden sm:table-cell">{c.pontosPorAno[a.ano] || '—'}</td>
                            ))}
                            <td className="py-2.5 px-1 text-center text-gray-600 whitespace-nowrap hidden sm:table-cell">{c.ouro}·{c.prata}·{c.bronze}</td>
                            <td className="py-2.5 pl-2 text-right text-base font-black text-blue-700">{c.pontos}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
          )}

          {/* Provas */}
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
            <h2 className="text-sm font-black text-gray-900 uppercase tracking-wider">Provas da época {epoca.nome}</h2>
            <form onSubmit={criarProva} className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3">
              <input
                type="text"
                value={nomeProva}
                onChange={(e) => setNomeProva(e.target.value)}
                placeholder="Nome da prova (ex: Torneio de Natal de Odivelas)"
                required
                className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="date"
                value={dataProva}
                onChange={(e) => setDataProva(e.target.value)}
                required
                className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 bg-white"
              />
              <button
                type="submit"
                disabled={aGuardar}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs"
              >
                + Criar prova
              </button>
            </form>
            {provas.length === 0 ? (
              <p className="text-xs text-gray-500">Ainda não há provas nesta época.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {provas.map((p) => (
                  <Link
                    key={p.id}
                    href={`/dashboard/ranking/provas/${p.id}`}
                    className="flex items-center justify-between gap-3 py-3 hover:bg-gray-50 -mx-2 px-2 rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-bold text-gray-900">{p.nome}</p>
                      <p className="text-xs text-gray-500">{formatarData(p.data)} · {atletasPorProva.get(p.id) || 0} atletas</p>
                    </div>
                    <span className="text-xs font-bold text-blue-600">Resultados →</span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {!loading && epocas.length === 0 && !erro && (
        <p className="text-xs text-gray-500">Não há épocas criadas. Corra a migração 20261111_ranking_torneios.sql no Supabase.</p>
      )}
    </div>
  );
}
