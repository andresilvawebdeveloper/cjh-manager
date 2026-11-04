'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../../../lib/supabase/client';
import { formatarData } from '../../../../lib/analise';

interface Inscricao {
  id: number;
  nome: string;
  aluno_id: number | null;
  genero: string;
  categoria: string;
  competicao_id: number;
  analise_competicoes: { id: number; nome: string; data: string } | null;
  analise_combates: { id: number; resultado: string | null }[];
}

interface Totais {
  competicoes: number;
  combates: number;
  vitorias: number;
  derrotas: number;
  semResultado: number;
}

// O mesmo atleta pode aparecer em várias competições: agrupar pela ficha do clube ou pelo nome
const chaveAtleta = (i: Inscricao) => (i.aluno_id ? `a${i.aluno_id}` : `n${i.nome.trim().toLowerCase()}`);

function calcular(inscricoes: Inscricao[]): Totais {
  const combates = inscricoes.flatMap((i) => i.analise_combates || []);
  return {
    competicoes: new Set(inscricoes.map((i) => i.competicao_id)).size,
    combates: combates.length,
    vitorias: combates.filter((c) => c.resultado === 'Vitória').length,
    derrotas: combates.filter((c) => c.resultado === 'Derrota').length,
    semResultado: combates.filter((c) => !c.resultado).length,
  };
}

const percentagem = (t: Totais) => {
  const decididos = t.vitorias + t.derrotas;
  return decididos ? Math.round((t.vitorias / decididos) * 100) : null;
};

function BarraVD({ t }: { t: Totais }) {
  const decididos = t.vitorias + t.derrotas;
  if (!decididos) return <div className="h-2 rounded-full bg-gray-100" />;
  return (
    <div className="h-2 rounded-full overflow-hidden flex bg-gray-100">
      <div className="bg-emerald-500" style={{ width: `${(t.vitorias / decididos) * 100}%` }} />
      <div className="bg-red-400" style={{ width: `${(t.derrotas / decididos) * 100}%` }} />
    </div>
  );
}

function Pct({ t }: { t: Totais }) {
  const p = percentagem(t);
  if (p === null) return <span className="text-gray-400">—</span>;
  const cor = p >= 60 ? 'text-emerald-700' : p >= 40 ? 'text-amber-700' : 'text-red-600';
  return <span className={`font-black ${cor}`}>{p}%</span>;
}

export default function DashboardResultados({ atualizacao }: { atualizacao: number }) {
  const [inscricoes, setInscricoes] = useState<Inscricao[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [filtro, setFiltro] = useState('TODOS');

  useEffect(() => {
    carregar();
  }, [atualizacao]);

  async function carregar() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('analise_atletas')
        .select('id, nome, aluno_id, genero, categoria, competicao_id, analise_competicoes(id, nome, data), analise_combates(id, resultado)');
      if (error) throw error;
      setInscricoes((data as any) || []);
    } catch (err: any) {
      setErro('Erro ao carregar resultados: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  // Lista de atletas (agrupados) com os respetivos totais
  const atletas = useMemo(() => {
    const grupos = new Map<string, Inscricao[]>();
    inscricoes.forEach((i) => {
      const k = chaveAtleta(i);
      grupos.set(k, [...(grupos.get(k) || []), i]);
    });
    return Array.from(grupos.entries())
      .map(([chave, lista]) => ({ chave, nome: lista[0].nome, genero: lista[0].genero, lista, totais: calcular(lista) }))
      .sort((a, b) => b.totais.vitorias - a.totais.vitorias || a.totais.derrotas - b.totais.derrotas || a.nome.localeCompare(b.nome));
  }, [inscricoes]);

  // Se o atleta filtrado deixar de existir (ex: removido), voltar a "todos"
  useEffect(() => {
    if (filtro !== 'TODOS' && !atletas.some((a) => a.chave === filtro)) setFiltro('TODOS');
  }, [atletas, filtro]);

  const selecionado = atletas.find((a) => a.chave === filtro) || null;
  const totais = selecionado ? selecionado.totais : calcular(inscricoes);

  // Detalhe por competição do atleta selecionado (mais recente primeiro)
  const porCompeticao = useMemo(
    () =>
      (selecionado?.lista || [])
        .slice()
        .sort((a, b) => (b.analise_competicoes?.data || '').localeCompare(a.analise_competicoes?.data || '')),
    [selecionado]
  );

  if (loading && inscricoes.length === 0) return <p className="text-xs text-gray-500">A carregar resultados...</p>;
  if (erro) return <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl">{erro}</div>;
  if (inscricoes.length === 0) return null;

  const cartoes = [
    { titulo: 'Competições', valor: totais.competicoes, cor: 'text-gray-900' },
    { titulo: 'Combates', valor: totais.combates, cor: 'text-gray-900' },
    { titulo: 'Vitórias', valor: totais.vitorias, cor: 'text-emerald-600' },
    { titulo: 'Derrotas', valor: totais.derrotas, cor: 'text-red-500' },
  ];

  return (
    <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-black text-gray-900 uppercase tracking-wider">📊 Resultados Gerais</h2>
          <p className="text-xs text-gray-500 mt-1">Vitórias e derrotas em todas as competições registadas.</p>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Atleta</label>
          <select
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 bg-white min-w-[200px] focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="TODOS">Todos os atletas</option>
            {atletas
              .slice()
              .sort((a, b) => a.nome.localeCompare(b.nome))
              .map((a) => (
                <option key={a.chave} value={a.chave}>{a.nome}</option>
              ))}
          </select>
        </div>
      </div>

      {/* Cartões de resumo */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {cartoes.map((c) => (
          <div key={c.titulo} className="bg-gray-50 rounded-xl p-4">
            <p className="text-[10px] font-bold text-gray-500 uppercase">{c.titulo}</p>
            <p className={`text-2xl font-black ${c.cor}`}>{c.valor}</p>
          </div>
        ))}
        <div className="bg-gray-50 rounded-xl p-4 col-span-2 md:col-span-1 space-y-2">
          <p className="text-[10px] font-bold text-gray-500 uppercase">% Vitórias</p>
          <p className="text-2xl"><Pct t={totais} /></p>
          <BarraVD t={totais} />
        </div>
      </div>
      {totais.semResultado > 0 && (
        <p className="text-[11px] text-gray-500">
          {totais.semResultado} {totais.semResultado === 1 ? 'combate sem resultado registado' : 'combates sem resultado registado'} (não contam para a %).
        </p>
      )}

      {/* Tabela */}
      <div className="overflow-x-auto -mx-6 px-6">
        {!selecionado ? (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[10px] font-bold text-gray-500 uppercase border-b border-gray-100">
                <th className="py-2 pr-3">Atleta</th>
                <th className="py-2 px-2 text-center">Comp.</th>
                <th className="py-2 px-2 text-center">Combates</th>
                <th className="py-2 px-2 text-center">V</th>
                <th className="py-2 px-2 text-center">D</th>
                <th className="py-2 px-2 text-center">%</th>
                <th className="py-2 pl-2 w-32 hidden md:table-cell"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {atletas.map((a) => (
                <tr key={a.chave} onClick={() => setFiltro(a.chave)} className="hover:bg-blue-50/50 cursor-pointer">
                  <td className="py-2.5 pr-3">
                    <span className="font-bold text-gray-900">{a.nome}</span>
                    <span className="text-[10px] text-gray-400 ml-1.5">{a.genero === 'Feminino' ? 'F' : 'M'}</span>
                  </td>
                  <td className="py-2.5 px-2 text-center text-gray-700">{a.totais.competicoes}</td>
                  <td className="py-2.5 px-2 text-center text-gray-700">{a.totais.combates}</td>
                  <td className="py-2.5 px-2 text-center font-bold text-emerald-600">{a.totais.vitorias}</td>
                  <td className="py-2.5 px-2 text-center font-bold text-red-500">{a.totais.derrotas}</td>
                  <td className="py-2.5 px-2 text-center"><Pct t={a.totais} /></td>
                  <td className="py-2.5 pl-2 hidden md:table-cell"><BarraVD t={a.totais} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[10px] font-bold text-gray-500 uppercase border-b border-gray-100">
                <th className="py-2 pr-3">Competição</th>
                <th className="py-2 px-2">Data</th>
                <th className="py-2 px-2">Categoria</th>
                <th className="py-2 px-2 text-center">Combates</th>
                <th className="py-2 px-2 text-center">V</th>
                <th className="py-2 px-2 text-center">D</th>
                <th className="py-2 px-2 text-center">%</th>
                <th className="py-2 pl-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {porCompeticao.map((i) => {
                const t = calcular([i]);
                return (
                  <tr key={i.id}>
                    <td className="py-2.5 pr-3 font-bold text-gray-900">{i.analise_competicoes?.nome}</td>
                    <td className="py-2.5 px-2 text-gray-600 whitespace-nowrap">{formatarData(i.analise_competicoes?.data || '')}</td>
                    <td className="py-2.5 px-2 text-gray-600">{i.categoria}</td>
                    <td className="py-2.5 px-2 text-center text-gray-700">{t.combates}</td>
                    <td className="py-2.5 px-2 text-center font-bold text-emerald-600">{t.vitorias}</td>
                    <td className="py-2.5 px-2 text-center font-bold text-red-500">{t.derrotas}</td>
                    <td className="py-2.5 px-2 text-center"><Pct t={t} /></td>
                    <td className="py-2.5 pl-2 text-right">
                      <Link
                        href={`/dashboard/analise/${i.competicao_id}/atletas/${i.id}`}
                        className="font-bold text-blue-600 hover:underline whitespace-nowrap"
                      >
                        Combates →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      {selecionado && (
        <button onClick={() => setFiltro('TODOS')} className="text-xs font-bold text-gray-500 hover:text-blue-600">
          ← Ver todos os atletas
        </button>
      )}
    </section>
  );
}
