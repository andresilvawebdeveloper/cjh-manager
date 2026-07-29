'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../../../../lib/supabase/client';
import { exportarMapaPresencasExcel } from './exportarExcel';

interface Aluno {
  id: number;
  nome: string;
  data_nascimento: string;
}

interface Presenca {
  id?: number;
  aluno_id: number;
  turma_id: number;
  data_treino: string;
  estado: string;
}

interface TurmaDetalhe {
  id: number;
  nome: string;
  centros: { nome: string } | null;
  turma_horarios: { dia_semana: string; hora_inicio: string; hora_fim: string }[];
}

const coresMeses: Record<string, { bg: string; text: string }> = {
  'Setembro': { bg: 'bg-slate-200', text: 'text-slate-800' },
  'Outubro': { bg: 'bg-emerald-100', text: 'text-emerald-800' },
  'Novembro': { bg: 'bg-amber-100', text: 'text-amber-800' },
  'Dezembro': { bg: 'bg-sky-100', text: 'text-sky-800' },
  'Janeiro': { bg: 'bg-indigo-100', text: 'text-indigo-800' },
  'Fevereiro': { bg: 'bg-rose-100', text: 'text-rose-800' },
  'Março': { bg: 'bg-teal-100', text: 'text-teal-800' },
  'Abril': { bg: 'bg-purple-100', text: 'text-purple-800' },
  'Maio': { bg: 'bg-orange-100', text: 'text-orange-800' },
  'Junho': { bg: 'bg-lime-100', text: 'text-lime-800' },
  'Julho': { bg: 'bg-cyan-100', text: 'text-cyan-800' },
  'Agosto': { bg: 'bg-fuchsia-100', text: 'text-fuchsia-800' },
};

export default function TurmaDetalhesPage({ params }: { params: { turmaId: string } }) {
  const turmaId = params.turmaId;

  const [turma, setTurma] = useState<TurmaDetalhe | null>(null);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [todasPresencas, setTodasPresencas] = useState<Presenca[]>([]);
  
  const [dataSelecionada, setDataSelecionada] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [presencasDoDia, setPresencasDoDia] = useState<Record<number, string>>({});
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const carregarDados = async () => {
    try {
      setLoading(true);

      const { data: turmaData, error: turmaError } = await supabase
        .from('turmas')
        .select(`
          id,
          nome,
          centros ( nome ),
          turma_horarios ( dia_semana, hora_inicio, hora_fim )
        `)
        .eq('id', turmaId)
        .single();

      if (turmaError) throw turmaError;
      setTurma(turmaData as unknown as TurmaDetalhe);

      // Carregar alunos associados a esta turma (ajuste a relação caso utilize uma tabela intermédia tipo 'turma_alunos')
      const { data: alunosData, error: alunosError } = await supabase
        .from('alunos')
        .select('*')
        .eq('turma_id', turmaId)
        .order('nome', { ascending: true });

      if (alunosError) throw alunosError;
      setAlunos(alunosData || []);

      const { data: presencasData, error: presencasError } = await supabase
        .from('presencas')
        .select('*')
        .eq('turma_id', turmaId);

      if (presencasError) throw presencasError;
      setTodasPresencas(presencasData || []);

    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [turmaId]);

  useEffect(() => {
    const mapaPresencasDia: Record<number, string> = {};
    todasPresencas
      .filter((p) => p.data_treino === dataSelecionada)
      .forEach((p) => {
        mapaPresencasDia[p.aluno_id] = p.estado;
      });
    setPresencasDoDia(mapaPresencasDia);
  }, [dataSelecionada, todasPresencas]);

  const alterarEstadoPresenca = (alunoId: number, novoEstado: string) => {
    setPresencasDoDia((prev) => ({
      ...prev,
      [alunoId]: novoEstado,
    }));
  };

  const guardarPresencasDoDia = async () => {
    setSaving(true);
    try {
      const payload = alunos.map((aluno) => ({
        turma_id: Number(turmaId),
        aluno_id: aluno.id,
        data_treino: dataSelecionada,
        estado: presencasDoDia[aluno.id] || '-',
      }));

      const { error } = await supabase
        .from('presencas')
        .upsert(payload, { onConflict: 'turma_id,aluno_id,data_treino' });

      if (error) throw error;
      alert(`Presenças guardadas com sucesso para ${dataSelecionada}!`);
      await carregarDados();
    } catch (err: any) {
      alert('Erro ao guardar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const datasUnicas = Array.from(new Set(todasPresencas.map((p) => p.data_treino))).sort();

  const mesesObj: Record<string, string[]> = {};
  datasUnicas.forEach((dataStr) => {
    const dataObj = new Date(dataStr + 'T00:00:00');
    const nomeMes = dataObj.toLocaleString('pt-PT', { month: 'long' });
    const nomeMesFormatado = nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1);
    if (!mesesObj[nomeMesFormatado]) {
      mesesObj[nomeMesFormatado] = [];
    }
    mesesObj[nomeMesFormatado].push(dataStr);
  });

  if (loading) {
    return <div className="p-8 text-center text-xs text-gray-500">A carregar mapa de presenças...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
            {turma?.centros?.nome || 'Centro'}
          </span>
          <h1 className="text-2xl font-black text-gray-900 mt-1">{turma?.nome}</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => exportarMapaPresencasExcel(turma, alunos, todasPresencas)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center gap-2"
          >
            📊 Exportar Excel Estilizado (Cores e Meses)
          </button>
          <Link href="/dashboard/centros" className="text-xs font-bold text-blue-600 hover:underline">
            ← Voltar
          </Link>
        </div>
      </div>

      {/* PAINEL DE MARCAÇÃO EM DIRETO */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Modo de Marcação de Aula</h2>
            <p className="text-xs text-gray-400">Escolha o dia da aula para marcar em direto ou consultar o passado.</p>
          </div>
          <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-xl border border-gray-200">
            <input
              type="date"
              value={dataSelecionada}
              onChange={(e) => setDataSelecionada(e.target.value)}
              className="bg-white border border-gray-300 text-gray-900 text-xs font-bold rounded-lg p-2 focus:ring-blue-500"
            />
            <button
              onClick={guardarPresencasDoDia}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs cursor-pointer shadow-sm disabled:opacity-50"
            >
              {saving ? 'A guardar...' : `💾 Guardar (${dataSelecionada})`}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto max-h-60 border border-gray-100 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-500 uppercase font-bold sticky top-0">
              <tr>
                <th className="p-2.5">Atletas</th>
                <th className="p-2.5 text-center">Estado para o dia {dataSelecionada}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {alunos.length === 0 ? (
                <tr>
                  <td colSpan={2} className="p-4 text-center text-gray-400 italic">Não existem alunos associados a esta turma.</td>
                </tr>
              ) : (
                alunos.map((aluno) => {
                  const estado = presencasDoDia[aluno.id] || '-';
                  return (
                    <tr key={aluno.id} className="hover:bg-gray-50/50">
                      <td className="p-2.5 font-bold text-gray-900">{aluno.nome}</td>
                      <td className="p-2.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => alterarEstadoPresenca(aluno.id, 'Presente')}
                            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] ${estado === 'Presente' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-emerald-100'}`}
                          >
                            Presente
                          </button>
                          <button
                            type="button"
                            onClick={() => alterarEstadoPresenca(aluno.id, 'Faltou')}
                            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] ${estado === 'Faltou' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-red-100'}`}
                          >
                            Faltou
                          </button>
                          <button
                            type="button"
                            onClick={() => alterarEstadoPresenca(aluno.id, '-')}
                            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] ${estado === '-' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-400'}`}
                          >
                            -
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MAPA HISTÓRICO VISUAL */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-bold text-gray-900">Mapa Histórico da Época (Acumulado)</h2>
          <p className="text-xs text-gray-400">Visualização em grelha com os meses coloridos e todas as aulas dadas.</p>
        </div>

        {datasUnicas.length === 0 ? (
          <p className="text-xs text-gray-400 py-8 text-center italic">Ainda não existem aulas registadas nesta turma.</p>
        ) : (
          <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="p-3 border-r border-slate-700 min-w-[180px]">Atletas</th>
                  <th className="p-3 border-r border-slate-700 text-center min-w-[110px]">Ano Nascimento</th>
                  {Object.entries(mesesObj).map(([mes, datas]) => {
                    const estiloCor = coresMeses[mes] || { bg: 'bg-blue-100', text: 'text-blue-900' };
                    return (
                      <th
                        key={mes}
                        colSpan={datas.length}
                        className={`p-2.5 text-center font-black uppercase text-[11px] border-r border-b border-slate-300 ${estiloCor.bg} ${estiloCor.text}`}
                      >
                        {mes}
                      </th>
                    );
                  })}
                </tr>

                <tr className="bg-slate-800 text-slate-200 text-[11px]">
                  <th className="p-2.5 border-r border-slate-700"></th>
                  <th className="p-2.5 border-r border-slate-700 text-center"></th>
                  {datasUnicas.map((dataStr) => {
                    const [, mes, dia] = dataStr.split('-');
                    const dataFormatada = `${dia}/${mes}`;
                    return (
                      <th key={dataStr} className="p-2.5 text-center border-r border-slate-700 font-semibold whitespace-nowrap">
                        {dataFormatada}
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200 font-medium">
                {alunos.map((aluno, idx) => {
                  const anoNascimento = aluno.data_nascimento ? new Date(aluno.data_nascimento).getFullYear() : '-';
                  const linhaAlternada = idx % 2 === 0 ? 'bg-white' : 'bg-blue-50/30';

                  return (
                    <tr key={aluno.id} className={linhaAlternada}>
                      <td className="p-3 font-bold text-gray-900 border-r border-gray-200 whitespace-nowrap">
                        {aluno.nome}
                      </td>
                      <td className="p-3 text-center text-gray-600 border-r border-gray-200 font-semibold">
                        {anoNascimento}
                      </td>
                      {datasUnicas.map((dataStr) => {
                        const registo = todasPresencas.find(
                          (p) => p.aluno_id === aluno.id && p.data_treino === dataStr
                        );
                        const estado = registo ? registo.estado : '-';

                        let corEstado = 'text-gray-400 font-normal';
                        if (estado === 'Presente') corEstado = 'text-emerald-700 font-bold';
                        if (estado === 'Faltou') corEstado = 'text-red-600 font-bold';

                        return (
                          <td key={dataStr} className={`p-3 text-center border-r border-gray-200 whitespace-nowrap ${corEstado}`}>
                            {estado}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}