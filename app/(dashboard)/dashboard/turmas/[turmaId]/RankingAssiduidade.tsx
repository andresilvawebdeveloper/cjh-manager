'use client';

import { useMemo, useState } from 'react';

type Periodo = 'semana' | 'mes' | 'ano';

interface Props {
  alunos: { id: number; nome: string; graduacao?: string | null }[];
  presencas: { aluno_id: number; data: string; presente: boolean }[];
}

// Cores dos cintos de Judo (graduações compostas ficam com as duas cores)
const CORES_CINTO: Record<string, string> = {
  Branco: '#f8fafc',
  Amarelo: '#facc15',
  Laranja: '#f97316',
  Verde: '#16a34a',
  Azul: '#2563eb',
  Castanho: '#78350f',
  Preto: '#111827',
};

const MEDALHAS = ['🥇', '🥈', '🥉'];

const pad = (n: number) => String(n).padStart(2, '0');
const isoLocal = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const curta = (d: Date) => `${d.getDate()}/${d.getMonth() + 1}`;

/** Início e fim do período que contém a data de referência, deslocado `offset` períodos. */
function intervalo(periodo: Periodo, offset: number) {
  const hoje = new Date();
  if (periodo === 'semana') {
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    const diaSemana = (inicio.getDay() + 6) % 7; // segunda = 0
    inicio.setDate(inicio.getDate() - diaSemana + offset * 7);
    const fim = new Date(inicio);
    fim.setDate(inicio.getDate() + 6);
    return { inicio, fim, rotulo: offset === 0 ? 'Esta semana' : 'Semana', detalhe: `${curta(inicio)} — ${curta(fim)}` };
  }
  if (periodo === 'mes') {
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth() + offset, 1);
    const fim = new Date(inicio.getFullYear(), inicio.getMonth() + 1, 0);
    const nomeMes = inicio.toLocaleDateString('pt-PT', { month: 'long' });
    return {
      inicio,
      fim,
      rotulo: `${nomeMes.charAt(0).toUpperCase()}${nomeMes.slice(1)} ${inicio.getFullYear()}`,
      detalhe: `${curta(inicio)} — ${curta(fim)}`,
    };
  }
  const ano = hoje.getFullYear() + offset;
  return { inicio: new Date(ano, 0, 1), fim: new Date(ano, 11, 31), rotulo: String(ano), detalhe: '1/1 — 31/12' };
}

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  const primeira = partes[0][0];
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return (primeira + ultima).toUpperCase();
}

function Cinto({ graduacao }: { graduacao?: string | null }) {
  const cores = (graduacao || 'Branco').split('/').map((c) => CORES_CINTO[c.trim()] || CORES_CINTO.Branco);
  const fundo = cores.length > 1 ? `linear-gradient(90deg, ${cores[0]} 50%, ${cores[1]} 50%)` : cores[0];
  return (
    <div className="flex items-center gap-2">
      <div className="h-3 w-24 rounded-full border border-gray-300 shadow-inner" style={{ background: fundo }} title={graduacao || 'Branco'} />
      <span className="text-[10px] text-gray-400 hidden sm:inline">{graduacao || 'Branco'}</span>
    </div>
  );
}

function Avatar({ nome, grande }: { nome: string; grande?: boolean }) {
  return (
    <div
      className={`rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 ${
        grande ? 'w-16 h-16 text-xl' : 'w-10 h-10 text-sm'
      }`}
    >
      {iniciais(nome)}
    </div>
  );
}

export default function RankingAssiduidade({ alunos, presencas }: Props) {
  const [periodo, setPeriodo] = useState<Periodo>('mes');
  const [offset, setOffset] = useState(0);

  const { inicio, fim, rotulo, detalhe } = intervalo(periodo, offset);
  const de = isoLocal(inicio);
  const ate = isoLocal(fim);

  const { ranking, totalAulas } = useMemo(() => {
    const noPeriodo = presencas.filter((p) => p.data >= de && p.data <= ate);
    const contagem = new Map<number, number>();
    noPeriodo.forEach((p) => {
      if (p.presente) contagem.set(p.aluno_id, (contagem.get(p.aluno_id) || 0) + 1);
    });

    const lista = alunos
      .map((a) => ({ ...a, aulas: contagem.get(a.id) || 0 }))
      .filter((a) => a.aulas > 0)
      .sort((a, b) => b.aulas - a.aulas || a.nome.localeCompare(b.nome));

    // Ranking com empates (ex: 1, 2, 2, 4)
    let posicaoAnterior = 0;
    const comPosicao = lista.map((a, i) => {
      const posicao = i > 0 && a.aulas === lista[i - 1].aulas ? posicaoAnterior : i + 1;
      posicaoAnterior = posicao;
      return { ...a, posicao };
    });

    return { ranking: comPosicao, totalAulas: new Set(noPeriodo.map((p) => p.data)).size };
  }, [alunos, presencas, de, ate]);

  const podio = ranking.slice(0, 3);
  // Ordem visual do pódio: 2.º, 1.º, 3.º
  const ordemPodio = podio.length === 3 ? [podio[1], podio[0], podio[2]] : podio.length === 2 ? [podio[1], podio[0]] : podio;
  const restantes = ranking.slice(3);

  const mudarPeriodo = (p: Periodo) => {
    setPeriodo(p);
    setOffset(0);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider">🏆 Ranking de Assiduidade</h2>
        {totalAulas > 0 && (
          <span className="text-[11px] text-gray-500">
            {totalAulas} {totalAulas === 1 ? 'aula registada' : 'aulas registadas'} no período
          </span>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Seletor de período */}
        <div className="grid grid-cols-3 rounded-xl border border-gray-200 overflow-hidden">
          {(['semana', 'mes', 'ano'] as Periodo[]).map((p) => (
            <button
              key={p}
              onClick={() => mudarPeriodo(p)}
              className={`py-2.5 text-sm font-medium transition-all ${
                periodo === p ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {p === 'semana' ? 'Semana' : p === 'mes' ? 'Mês' : 'Ano'}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={() => setOffset((o) => o - 1)}
            className="w-8 h-8 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 font-bold"
            aria-label="Período anterior"
          >
            ‹
          </button>
          <div className="text-center leading-tight">
            <p className="text-sm font-semibold text-gray-700">{rotulo}</p>
            <p className="text-xs text-gray-400">{detalhe}</p>
          </div>
          <button
            onClick={() => setOffset((o) => Math.min(0, o + 1))}
            disabled={offset === 0}
            className="w-8 h-8 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 font-bold disabled:opacity-30"
            aria-label="Período seguinte"
          >
            ›
          </button>
        </div>

        {ranking.length === 0 ? (
          <p className="py-8 text-center text-xs text-gray-500">Sem presenças registadas neste período.</p>
        ) : (
          <>
            {/* Pódio */}
            <div className={`grid gap-3 items-end ${ordemPodio.length === 3 ? 'grid-cols-3' : ordemPodio.length === 2 ? 'grid-cols-2' : 'grid-cols-1 max-w-[200px] mx-auto'}`}>
              {ordemPodio.map((a) => {
                const primeiro = a.posicao === 1;
                return (
                  <div
                    key={a.id}
                    className={`rounded-2xl border-2 p-3 flex flex-col items-center text-center gap-1.5 ${
                      primeiro ? 'bg-yellow-50 border-yellow-300 pb-5' : 'bg-white border-gray-200'
                    }`}
                  >
                    <span className={primeiro ? 'text-4xl' : 'text-3xl'}>{MEDALHAS[a.posicao - 1] || ''}</span>
                    <Avatar nome={a.nome} grande />
                    <p className="text-sm font-semibold text-gray-900 leading-tight">{a.nome}</p>
                    <p className="text-xs text-gray-500">
                      {a.aulas} {a.aulas === 1 ? 'aula' : 'aulas'}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Restantes */}
            {restantes.length > 0 && (
              <div className="space-y-2">
                {restantes.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 rounded-2xl border border-gray-100 shadow-sm px-4 py-3">
                    <span className="w-6 text-center text-lg text-gray-500">{a.posicao}</span>
                    <Avatar nome={a.nome} />
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{a.nome}</p>
                      <Cinto graduacao={a.graduacao} />
                    </div>
                    <span className="text-lg text-gray-900">{a.aulas}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
