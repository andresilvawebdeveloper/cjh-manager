'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { supabase } from '../../../../../lib/supabase/client';
import { exportarMapaPresencasExcel } from './exportarExcel';

interface Aluno {
  id: number;
  nome: string;
  data_nascimento: string;
  graduacao: string;
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

export default function TurmaDetalhesPage({ params }: { params: Promise<{ turmaId: string }> }) {
  const resolvedParams = use(params);
  const turmaId = resolvedParams.turmaId;

  const [turma, setTurma] = useState<TurmaDetalhe | null>(null);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [todasPresencas, setTodasPresencas] = useState<Presenca[]>([]);
  
  const [dataSelecionada, setDataSelecionada] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [presencasDoDia, setPresencasDoDia] = useState<Record<number, string>>({});
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Estados do Modal
  const [mostrarModalAluno, setMostrarModalAluno] = useState(false);
  const [novoNomeAluno, setNovoNomeAluno] = useState('');
  const [novaDataNascimento, setNovaDataNascimento] = useState('');
  const [novaGraduacao, setNovaGraduacao] = useState('Branco');
  const [adicionandoAluno, setAdicionandoAluno] = useState(false);

  const calcularIdadeEAnos = (dataNasc: string) => {
    if (!dataNasc) return { idade: '-', anoNascimento: '-' };
    const hoje = new Date();
    const nascimento = new Date(dataNasc);
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const m = hoje.getMonth() - nascimento.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) {
      idade--;
    }
    return { idade, anoNascimento: nascimento.getFullYear() };
  };

  const calcularEscalaoAutomatico = (dataNasc: string) => {
    if (!dataNasc) return 'Selecione a data de nascimento';
    const anoNasc = new Date(dataNasc).getFullYear();
    const anoAtual = new Date().getFullYear();
    const idade = anoAtual - anoNasc;

    if (idade <= 7) return 'Benjamins';
    if (idade >= 8 && idade <= 9) return 'Infantis';
    if (idade >= 10 && idade <= 11) return 'Iniciados';
    if (idade >= 12 && idade <= 14) return 'Juvenis';
    if (idade >= 15 && idade <= 17) return 'Cadetes';
    if (idade >= 18 && idade <= 20) return 'Juniores';
    if (idade >= 21 && idade <= 35) return 'Seniores';
    return 'Veteranos';
  };

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

    } catch (err: any) {
      console.error('Erro detalhado capturado:', err);
      alert('Erro ao carregar dados: ' + (err.message || JSON.stringify(err)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (turmaId) {
      carregarDados();
    }
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
      await carregarDados();
    } catch (err: any) {
      alert('Erro ao guardar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const adicionarAtleta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNomeAluno.trim()) return;

    setAdicionandoAluno(true);
    try {
      const { error } = await supabase.from('alunos').insert([
        {
          nome: novoNomeAluno.trim(),
          data_nascimento: novaDataNascimento || null,
          graduacao: novaGraduacao || 'Branco',
          turma_id: Number(turmaId),
        },
      ]);

      if (error) throw error;

      setNovoNomeAluno('');
      setNovaDataNascimento('');
      setNovaGraduacao('Branco');
      setMostrarModalAluno(false);
      await carregarDados();
    } catch (err: any) {
      alert('Erro ao adicionar atleta: ' + err.message);
    } finally {
      setAdicionandoAluno(false);
    }
  };

  const removerAtleta = async (alunoId: number, nomeAluno: string) => {
    if (!confirm(`Tem a certeza que pretende remover o atleta "${nomeAluno}"?`)) return;

    try {
      const { error } = await supabase.from('alunos').delete().eq('id', alunoId);
      if (error) throw error;
      await carregarDados();
    } catch (err: any) {
      alert('Erro ao remover atleta: ' + err.message);
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
            onClick={() => setMostrarModalAluno(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center gap-2"
          >
            ➕ Adicionar Atleta
          </button>
          <button
            onClick={() => exportarMapaPresencasExcel(turma, alunos, todasPresencas)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center gap-2"
          >
            📊 Exportar Excel
          </button>
          <Link href="/dashboard/centros" className="text-xs font-bold text-blue-600 hover:underline">
            ← Voltar
          </Link>
        </div>
      </div>

      {mostrarModalAluno && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Registar Novo Atleta</h2>
            <form onSubmit={adicionarAtleta} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={novoNomeAluno}
                  onChange={(e) => setNovoNomeAluno(e.target.value)}
                  placeholder="Ex: Gonçalo Silva"
                  className="w-full p-2.5 text-xs border border-gray-300 rounded-xl focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Data de Nascimento</label>
                <input
                  type="date"
                  required
                  value={novaDataNascimento}
                  onChange={(e) => setNovaDataNascimento(e.target.value)}
                  className="w-full p-2.5 text-xs border border-gray-300 rounded-xl focus:ring-blue-500"
                />
              </div>

              {/* Caixa informativa do Escalão Automático */}
              {novaDataNascimento && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs">
                  <span className="font-bold text-blue-900 uppercase">Escalão Calculado:</span>
                  <span className="font-black text-blue-600 uppercase bg-white px-2 py-1 rounded-md shadow-2xs">
                    {calcularEscalaoAutomatico(novaDataNascimento)}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Graduação (Cinto)</label>
                <select
                  value={novaGraduacao}
                  onChange={(e) => setNovaGraduacao(e.target.value)}
                  className="w-full p-2.5 text-xs border border-gray-300 rounded-xl focus:ring-blue-500 bg-white"
                >
                  <option value="Branco">Branco</option>
                  <option value="Branco/Amarelo">Branco/Amarelo</option>
                  <option value="Amarelo">Amarelo</option>
                  <option value="Amarelo/Laranja">Amarelo/Laranja</option>
                  <option value="Laranja">Laranja</option>
                  <option value="Laranja/Verde">Laranja/Verde</option>
                  <option value="Verde">Verde</option>
                  <option value="Azul">Azul</option>
                  <option value="Castanho">Castanho</option>
                  <option value="Preto">Preto</option>
                </select>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMostrarModalAluno(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={adicionandoAluno}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50"
                >
                  {adicionandoAluno ? 'A guardar...' : 'Guardar Atleta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                <th className="p-2.5 text-center">Escalão</th>
                <th className="p-2.5 text-center">Graduação</th>
                <th className="p-2.5 text-center">Estado para o dia {dataSelecionada}</th>
                <th className="p-2.5 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {alunos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-gray-400 italic">Não existem alunos associados a esta turma. Clique em "Adicionar Atleta" acima.</td>
                </tr>
              ) : (
                alunos.map((aluno) => {
                  const estado = presencasDoDia[aluno.id] || '-';
                  return (
                    <tr key={aluno.id} className="hover:bg-gray-50/50">
                      <td className="p-2.5 font-bold text-gray-900">{aluno.nome}</td>
                      <td className="p-2.5 text-center font-bold text-amber-700">{calcularEscalaoAutomatico(aluno.data_nascimento)}</td>
                      <td className="p-2.5 text-center font-semibold text-blue-600">{aluno.graduacao || 'Branco'}</td>
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
                      <td className="p-2.5 text-center">
                        <button
                          onClick={() => removerAtleta(aluno.id, aluno.nome)}
                          className="px-2.5 py-1 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-lg font-bold text-[11px] transition-all cursor-pointer"
                        >
                          Remover
                        </button>
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
                  <th className="p-3 border-r border-slate-700 text-center min-w-[110px]">Escalão</th>
                  <th className="p-3 border-r border-slate-700 text-center min-w-[100px]">Graduação</th>
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
                  <th className="p-2.5 border-r border-slate-700 text-center"></th>
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
                  const { anoNascimento } = calcularIdadeEAnos(aluno.data_nascimento);
                  const linhaAlternada = idx % 2 === 0 ? 'bg-white' : 'bg-blue-50/30';

                  return (
                    <tr key={aluno.id} className={linhaAlternada}>
                      <td className="p-3 font-bold text-gray-900 border-r border-gray-200 whitespace-nowrap">
                        {aluno.nome}
                      </td>
                      <td className="p-3 text-center text-gray-600 border-r border-gray-200 font-semibold">
                        {anoNascimento}
                      </td>
                      <td className="p-3 text-center text-amber-700 border-r border-gray-200 font-bold">
                        {calcularEscalaoAutomatico(aluno.data_nascimento)}
                      </td>
                      <td className="p-3 text-center text-blue-600 border-r border-gray-200 font-semibold">
                        {aluno.graduacao || 'Branco'}
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