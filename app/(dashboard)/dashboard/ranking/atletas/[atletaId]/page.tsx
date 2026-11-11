'use client';

import { useEffect, useMemo, useState, use } from 'react';
import Link from 'next/link';
import { supabase } from '../../../../../../lib/supabase/client';
import { lerTudo } from '../../../../../../lib/supabase/utils';
import { formatarData } from '../../../../../../lib/analise';
import {
  AtletaRanking,
  Centro,
  Epoca,
  PONTOS,
  ROTULO_CLASSIFICACAO,
  Resultado,
  calcularRanking,
} from '../../../../../../lib/rankingTorneios';

interface Prova {
  id: number;
  nome: string;
  data: string;
}

export default function AtletaRankingPage({ params }: { params: Promise<{ atletaId: string }> }) {
  const { atletaId } = use(params);
  const id = Number(atletaId);

  const [atleta, setAtleta] = useState<(AtletaRanking & { epoca_id: number }) | null>(null);
  const [epoca, setEpoca] = useState<Epoca | null>(null);
  const [centros, setCentros] = useState<Centro[]>([]);
  const [provas, setProvas] = useState<Prova[]>([]);
  const [atletas, setAtletas] = useState<AtletaRanking[]>([]);
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    carregar();
  }, [atletaId]);

  async function carregar() {
    try {
      setLoading(true);
      const { data: a, error } = await supabase.from('ranking_atletas').select('*').eq('id', id).single();
      if (error) throw error;
      const [epRes, ceRes, prRes, ats] = await Promise.all([
        supabase.from('ranking_epocas').select('*').eq('id', a.epoca_id).single(),
        supabase.from('ranking_centros').select('id, nome'),
        supabase.from('ranking_provas').select('id, nome, data').eq('epoca_id', a.epoca_id),
        lerTudo<AtletaRanking>((de, ate) =>
          supabase.from('ranking_atletas').select('id, nome, ano, centro_id').eq('epoca_id', a.epoca_id).order('id').range(de, ate)
        ),
      ]);
      if (prRes.error) throw prRes.error;
      const ids = (prRes.data || []).map((p) => p.id);
      const res = ids.length
        ? await lerTudo<Resultado>((de, ate) => supabase.from('ranking_resultados').select('*').in('prova_id', ids).order('id').range(de, ate))
        : [];
      setAtleta(a);
      setEpoca(epRes.data as Epoca);
      setCentros(ceRes.data || []);
      setProvas(prRes.data || []);
      setAtletas(ats);
      setResultados(res);
    } catch (err: any) {
      setErro('Erro ao carregar o atleta: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  const nomeCentro = (cid: number | null) => centros.find((c) => c.id === cid)?.nome || 'Sem centro';
  const escalao = epoca?.anos.find((x) => x.ano === atleta?.ano)?.escalao || '';
  const provaPorId = useMemo(() => new Map(provas.map((p) => [p.id, p])), [provas]);
  const provasPorData = useMemo(() => new Map(provas.map((p) => [p.id, p.data])), [provas]);

  // Posição atual no ano e no geral
  const posicoes = useMemo(() => {
    if (!atleta) return null;
    const noAno = calcularRanking(atletas, resultados, provasPorData, atleta.ano);
    const geral = calcularRanking(atletas, resultados, provasPorData, null);
    return {
      ano: noAno.atletas.find((l) => l.atleta.id === atleta.id) || null,
      totalAno: noAno.atletas.length,
      geral: geral.atletas.find((l) => l.atleta.id === atleta.id)?.posicao ?? null,
      totalGeral: geral.atletas.length,
    };
  }, [atleta, atletas, resultados, provasPorData]);

  // Percurso: provas do atleta por ordem de data, com pontos acumulados e posição no ano depois de cada prova
  const percurso = useMemo(() => {
    if (!atleta) return [];
    const meus = resultados
      .filter((r) => r.atleta_id === atleta.id)
      .map((r) => ({ r, prova: provaPorId.get(r.prova_id)! }))
      .filter((x) => x.prova)
      .sort((a, b) => a.prova.data.localeCompare(b.prova.data) || a.prova.id - b.prova.id);
    let acumulado = 0;
    return meus.map(({ r, prova }) => {
      acumulado += PONTOS[r.classificacao] || 0;
      const ate = resultados.filter((x) => {
        const p = provaPorId.get(x.prova_id);
        return p && (p.data < prova.data || (p.data === prova.data && p.id <= prova.id));
      });
      const tabela = calcularRanking(atletas, ate, provasPorData, atleta.ano);
      const posicao = tabela.atletas.find((l) => l.atleta.id === atleta.id)?.posicao ?? null;
      return { r, prova, acumulado, posicao };
    });
  }, [atleta, atletas, resultados, provaPorId, provasPorData]);

  if (loading) return <p className="text-xs text-gray-500">A carregar…</p>;
  if (!atleta || !posicoes) {
    return <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl">{erro || 'Atleta não encontrado.'}</div>;
  }

  const l = posicoes.ano;
  const centroAtual = l?.centroId ?? atleta.centro_id;
  const cartoes = [
    { titulo: `Posição em ${atleta.ano}`, valor: l ? `${l.posicao}.º` : '—', extra: l ? `de ${posicoes.totalAno}` : '' },
    { titulo: 'Posição geral', valor: posicoes.geral ? `${posicoes.geral}.º` : '—', extra: posicoes.geral ? `de ${posicoes.totalGeral}` : '' },
    { titulo: 'Pontos', valor: String(l?.pontos ?? 0), extra: `${l?.provas ?? 0} ${l?.provas === 1 ? 'prova' : 'provas'}` },
    { titulo: 'Medalhas', valor: `🥇${l?.ouro ?? 0} 🥈${l?.prata ?? 0} 🥉${l?.bronze ?? 0}`, extra: '' },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <Link href="/dashboard/ranking" className="text-xs font-bold text-gray-500 hover:text-blue-600 block mb-2">← Voltar ao Ranking</Link>
        <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Ranking · Época {epoca?.nome}</span>
        <h1 className="text-2xl font-black text-gray-900 mt-1">{atleta.nome}</h1>
        <p className="text-xs font-bold text-gray-500 mt-1">
          {atleta.ano}{escalao ? ` · ${escalao}` : ''} · {nomeCentro(centroAtual)}
        </p>
      </div>

      {erro && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl">{erro}</div>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cartoes.map((c) => (
          <div key={c.titulo} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-[10px] font-bold text-gray-500 uppercase">{c.titulo}</p>
            <p className="text-2xl font-black text-gray-900 mt-1">{c.valor}</p>
            {c.extra && <p className="text-[11px] text-gray-400">{c.extra}</p>}
          </div>
        ))}
      </div>

      <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
        <h2 className="text-sm font-black text-gray-900 uppercase tracking-wider">Provas e evolução</h2>
        {percurso.length === 0 ? (
          <p className="text-xs text-gray-500 py-4 text-center">Ainda não participou em nenhuma prova desta época.</p>
        ) : (
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] font-bold text-gray-500 uppercase border-b border-gray-100">
                  <th className="py-2 pr-2">Data</th>
                  <th className="py-2 px-2">Prova</th>
                  <th className="py-2 px-2 hidden sm:table-cell">Centro</th>
                  <th className="py-2 px-2">Classificação</th>
                  <th className="py-2 px-2 text-right">Pontos</th>
                  <th className="py-2 pl-2 text-right" title={`Posição no ranking de ${atleta.ano} depois desta prova`}>Posição</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {percurso.map(({ r, prova, acumulado, posicao }, i) => {
                  const anterior = i > 0 ? percurso[i - 1].posicao : null;
                  const subida = anterior && posicao ? anterior - posicao : 0;
                  return (
                    <tr key={r.id}>
                      <td className="py-2.5 pr-2 text-gray-500 whitespace-nowrap">{formatarData(prova.data)}</td>
                      <td className="py-2.5 px-2">
                        <Link href={`/dashboard/ranking/provas/${prova.id}`} className="font-bold text-gray-900 hover:text-blue-600">
                          {prova.nome}
                        </Link>
                        {r.peso && <span className="block text-[10px] text-gray-400">{r.peso}</span>}
                      </td>
                      <td className="py-2.5 px-2 text-gray-600 hidden sm:table-cell">{nomeCentro(r.centro_id)}</td>
                      <td className="py-2.5 px-2 text-gray-800 whitespace-nowrap">{ROTULO_CLASSIFICACAO[r.classificacao].replace(/ \(.*\)/, '')}</td>
                      <td className="py-2.5 px-2 text-right whitespace-nowrap">
                        <span className="font-black text-blue-700">+{PONTOS[r.classificacao]}</span>
                        <span className="block text-[10px] text-gray-400">total {acumulado}</span>
                      </td>
                      <td className="py-2.5 pl-2 text-right whitespace-nowrap">
                        <span className="font-black text-gray-900">{posicao ? `${posicao}.º` : '—'}</span>
                        {subida !== 0 && (
                          <span className={`block text-[10px] font-bold ${subida > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {subida > 0 ? `▲ ${subida}` : `▼ ${-subida}`}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-[11px] text-gray-400">
          "Posição" é o lugar no ranking de {atleta.ano} logo a seguir a cada prova (as setas mostram se subiu ou desceu).
        </p>
      </section>
    </div>
  );
}
