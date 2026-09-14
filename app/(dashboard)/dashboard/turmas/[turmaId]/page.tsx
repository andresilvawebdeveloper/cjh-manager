'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../../../lib/supabase/client';
import { exportarMapaPresencasExcel } from './exportarExcel';

const LISTA_GRADUACOES = [
  'Branco',
  'Branco/Amarelo',
  'Amarelo',
  'Amarelo/Laranja',
  'Laranja',
  'Laranja/Verde',
  'Verde',
  'Verde/Azul',
  'Azul',
  'Azul/Castanho',
  'Castanho',
  'Preto'
];

const MESES = [
  { id: 1, nome: 'Janeiro' },
  { id: 2, nome: 'Fevereiro' },
  { id: 3, nome: 'Março' },
  { id: 4, nome: 'Abril' },
  { id: 5, nome: 'Maio' },
  { id: 6, nome: 'Junho' },
  { id: 7, nome: 'Julho' },
  { id: 8, nome: 'Agosto' },
  { id: 9, nome: 'Setembro' },
  { id: 10, nome: 'Outubro' },
  { id: 11, nome: 'Novembro' },
  { id: 12, nome: 'Dezembro' }
];

export default function TurmaDetalhePage({ params }: { params: Promise<{ turmaId: string }> }) {
  const resolvedParams = use(params);
  const turmaId = resolvedParams.turmaId;
  const router = useRouter();

  const [turma, setTurma] = useState<any>(null);
  const [alunos, setAlunos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  // Aba ativa: 'presencas' ou 'aniversarios'
  const [abaAtiva, setAbaAtiva] = useState<'presencas' | 'aniversarios'>('presencas');

  // Estados para adicionar aluno
  const [nomeAluno, setNomeAluno] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [graduacao, setGraduacao] = useState('Branco');
  const [escalao, setEscalao] = useState('Benjamins');
  const [savingAluno, setSavingAluno] = useState(false);
  const [mostrarFormAluno, setMostrarFormAluno] = useState(false);

  // Estados para presenças (Data atual por defeito) -> 'presente' | 'faltou' | null
  const [dataPresenca, setDataPresenca] = useState(new Date().toISOString().split('T')[0]);
  const [presencas, setPresencas] = useState<{ [key: number]: boolean | null }>({});
  const [savingPresencas, setSavingPresencas] = useState(false);
  const [sucessoPresencas, setSucessoPresencas] = useState('');

  // Histórico de presenças de todas as datas
  const [historicoPresencas, setHistoricoPresencas] = useState<any[]>([]);

  useEffect(() => {
    carregarDados();
  }, [turmaId]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      setErro('');

      // 1. Carregar detalhes da turma e horários
      const { data: turmaData, error: turmaError } = await supabase
        .from('turmas')
        .select('id, nome, centros(nome), turma_horarios(dia_semana, hora_inicio, hora_fim)')
        .eq('id', turmaId)
        .maybeSingle();

      if (turmaError) throw turmaError;
      if (!turmaData) {
        setErro('Turma não encontrada ou sem permissões de acesso.');
        setLoading(false);
        return;
      }
      setTurma(turmaData);

      // 2. Carregar alunos desta turma
      const { data: alunosData, error: alunosError } = await supabase
        .from('alunos')
        .select('*')
        .eq('turma_id', turmaId)
        .order('nome', { ascending: true });

      if (alunosError) throw alunosError;
      const listaAlunos = alunosData || [];
      setAlunos(listaAlunos);

      // 3. Carregar presenças apenas se houver alunos
      if (listaAlunos.length > 0) {
        await carregarPresencasParaData(dataPresenca, listaAlunos);
        await carregarHistoricoPresencas(listaAlunos);
      } else {
        setPresencas({});
        setHistoricoPresencas([]);
      }

    } catch (err: any) {
      console.error('Erro detalhado capturado:', err);
      setErro('Erro ao carregar dados: ' + (err.message || JSON.stringify(err)));
    } finally {
      setLoading(false);
    }
  };

  const carregarPresencasParaData = async (dataStr: string, listaAlunos: any[]) => {
    if (!listaAlunos || listaAlunos.length === 0) return;
    try {
      const idsAlunos = listaAlunos.map(a => a.id);
      const { data, error } = await supabase
        .from('presencas')
        .select('aluno_id, presente')
        .eq('data', dataStr)
        .in('aluno_id', idsAlunos);

      if (error) throw error;

      const mapaPresencas: { [key: number]: boolean | null } = {};
      listaAlunos.forEach(a => {
        mapaPresencas[a.id] = null;
      });

      data?.forEach(p => {
        mapaPresencas[p.aluno_id] = p.presente;
      });
      setPresencas(mapaPresencas);
    } catch (err) {
      console.error('Erro ao carregar presenças:', err);
    }
  };

  const carregarHistoricoPresencas = async (listaAlunos: any[]) => {
    if (!listaAlunos || listaAlunos.length === 0) return;
    try {
      const idsAlunos = listaAlunos.map(a => a.id);
      const { data, error } = await supabase
        .from('presencas')
        .select('*, alunos(nome)')
        .in('aluno_id', idsAlunos)
        .order('data', { ascending: false });

      if (error) throw error;
      setHistoricoPresencas(data || []);
    } catch (err) {
      console.error('Erro ao carregar histórico de presenças:', err);
    }
  };

  const mudarDataPresenca = (novaData: string) => {
    setDataPresenca(novaData);
    if (alunos.length > 0) {
      carregarPresencasParaData(novaData, alunos);
    }
  };

  const definirEstadoPresenca = (alunoId: number, estado: boolean | null) => {
    setPresencas(prev => ({
      ...prev,
      [alunoId]: estado
    }));
  };

  const alterarGraduacaoAtleta = async (alunoId: number, novaGraduacao: string) => {
    try {
      const { error } = await supabase
        .from('alunos')
        .update({ graduacao: novaGraduacao })
        .eq('id', alunoId);

      if (error) throw error;

      setAlunos(prev => prev.map(a => a.id === alunoId ? { ...a, graduacao: novaGraduacao } : a));
    } catch (err: any) {
      alert('Erro ao atualizar graduação: ' + err.message);
    }
  };

  const alterarDataNascimentoAtleta = async (alunoId: number, novaData: string) => {
    try {
      const { error } = await supabase
        .from('alunos')
        .update({ data_nascimento: novaData || null })
        .eq('id', alunoId);

      if (error) throw error;

      setAlunos(prev => prev.map(a => a.id === alunoId ? { ...a, data_nascimento: novaData } : a));
    } catch (err: any) {
      alert('Erro ao atualizar data de nascimento: ' + err.message);
    }
  };

  const guardarPresencas = async () => {
    if (alunos.length === 0) return;
    setSavingPresencas(true);
    setSucessoPresencas('');
    try {
      const registos = alunos
        .filter(aluno => presencas[aluno.id] !== null && presencas[aluno.id] !== undefined)
        .map(aluno => {
          const valorPresente = !!presencas[aluno.id];
          return {
            aluno_id: aluno.id,
            turma_id: Number(turmaId),
            data: dataPresenca,
            presente: valorPresente,
            estado: valorPresente ? 'Presente' : 'Faltou'
          };
        });

      if (registos.length === 0) {
        alert('Selecione pelo menos um estado (Presente ou Faltou) antes de guardar.');
        setSavingPresencas(false);
        return;
      }

      const { error } = await supabase
        .from('presencas')
        .upsert(registos, { onConflict: 'aluno_id,data' });

      if (error) throw error;
      setSucessoPresencas('Presenças guardadas com sucesso!');
      carregarHistoricoPresencas(alunos);
      setTimeout(() => setSucessoPresencas(''), 3000);
    } catch (err: any) {
      alert('Erro ao guardar presenças: ' + err.message);
    } finally {
      setSavingPresencas(false);
    }
  };

  const removerPresencasData = async () => {
    if (!confirm(`Tem a certeza de que deseja remover todas as presenças registadas para a data ${dataPresenca}?`)) {
      return;
    }

    setSavingPresencas(true);
    try {
      const idsAlunos = alunos.map(a => a.id);
      if (idsAlunos.length === 0) return;

      const { error } = await supabase
        .from('presencas')
        .delete()
        .eq('data', dataPresenca)
        .in('aluno_id', idsAlunos);

      if (error) throw error;

      const mapaVazio: { [key: number]: null } = {};
      alunos.forEach(a => { mapaVazio[a.id] = null; });
      setPresencas(mapaVazio);

      setSucessoPresencas('Presenças da data removidas com sucesso!');
      carregarHistoricoPresencas(alunos);
      setTimeout(() => setSucessoPresencas(''), 3000);
    } catch (err: any) {
      alert('Erro ao remover presenças: ' + err.message);
    } finally {
      setSavingPresencas(false);
    }
  };

  const adicionarAluno = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAluno(true);
    setErro('');

    try {
      const { error } = await supabase.from('alunos').insert([
        {
          nome: nomeAluno,
          data_nascimento: dataNascimento || null,
          graduacao,
          escalao,
          turma_id: Number(turmaId),
        }
      ]);

      if (error) throw error;

      setNomeAluno('');
      setDataNascimento('');
      setGraduacao('Branco');
      setEscalao('Benjamins');
      setMostrarFormAluno(false);
      carregarDados();
    } catch (err: any) {
      console.error('Erro detalhado capturado:', err);
      setErro('Erro ao adicionar atleta: ' + (err.message || JSON.stringify(err)));
    } finally {
      setSavingAluno(false);
    }
  };

  const removerAtleta = async (alunoId: number, nomeAtleta: string) => {
    if (!confirm(`Tem a certeza de que deseja remover o atleta "${nomeAtleta}"? Esta ação removerá também o seu histórico de presenças.`)) {
      return;
    }

    try {
      await supabase.from('presencas').delete().eq('aluno_id', alunoId);

      const { error } = await supabase.from('alunos').delete().eq('id', alunoId);
      if (error) throw error;

      carregarDados();
    } catch (err: any) {
      alert('Erro ao remover atleta: ' + err.message);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs text-gray-500">A carregar dados da turma...</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-6">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/dashboard/centros" className="text-xs font-bold text-gray-500 hover:text-blue-600 block mb-2">← Voltar aos Centros</Link>
          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">{turma?.centros?.nome || 'Centro'}</span>
          <h1 className="text-2xl font-black text-gray-900 mt-1">{turma?.nome}</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportarMapaPresencasExcel(turma, alunos, historicoPresencas)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center gap-2"
          >
            📊 Exportar Excel
          </button>
          <button
            onClick={() => setMostrarFormAluno(!mostrarFormAluno)}
            className="px-4 py-2.5 bg-blue-950 hover:bg-blue-900 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center gap-2"
          >
            {mostrarFormAluno ? '✕ Fechar Formulário' : '＋ Adicionar Atleta'}
          </button>
        </div>
      </div>

      {erro && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl whitespace-pre-wrap">
          {erro}
        </div>
      )}

      {/* Formulário para Adicionar Atleta */}
      {mostrarFormAluno && (
        <div className="bg-white p-6 rounded-2xl border border-blue-900/10 shadow-lg space-y-4 transition-all">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Registar Novo Atleta</h2>

          <form onSubmit={adicionarAluno} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nome do Atleta</label>
                <input
                  type="text"
                  required
                  value={nomeAluno}
                  onChange={(e) => setNomeAluno(e.target.value)}
                  placeholder="Ex: João Silva"
                  className="w-full p-3 text-xs border border-gray-300 rounded-xl focus:ring-blue-900 bg-white text-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Data de Nascimento</label>
                <input
                  type="date"
                  value={dataNascimento}
                  onChange={(e) => setDataNascimento(e.target.value)}
                  className="w-full p-3 text-xs border border-gray-300 rounded-xl focus:ring-blue-900 bg-white text-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Escalão</label>
                <select
                  value={escalao}
                  onChange={(e) => setEscalao(e.target.value)}
                  className="w-full p-3 text-xs border border-gray-300 rounded-xl focus:ring-blue-900 bg-white text-gray-900"
                >
                  <option value="Benjamins">Benjamins</option>
                  <option value="Infantis">Infantis</option>
                  <option value="Iniciados">Iniciados</option>
                  <option value="Juvenis">Juvenis</option>
                  <option value="Cadetes">Cadetes</option>
                  <option value="Juniores">Juniores</option>
                  <option value="Seniores">Seniores</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Graduação (Cinto)</label>
                <select
                  value={graduacao}
                  onChange={(e) => setGraduacao(e.target.value)}
                  className="w-full p-3 text-xs border border-gray-300 rounded-xl focus:ring-blue-900 bg-white text-gray-900 font-medium"
                >
                  {LISTA_GRADUACOES.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMostrarFormAluno(false)}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingAluno}
                className="px-5 py-2.5 bg-blue-950 hover:bg-blue-900 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {savingAluno ? 'A guardar...' : '💾 Guardar Atleta'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sistema de Abas (Gestão de Presenças vs Aniversários) */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-3">
        <button
          onClick={() => setAbaAtiva('presencas')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            abaAtiva === 'presencas'
              ? 'bg-blue-950 text-white shadow'
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          📋 Gestão de Atletas e Presenças
        </button>
        <button
          onClick={() => setAbaAtiva('aniversarios')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            abaAtiva === 'aniversarios'
              ? 'bg-blue-950 text-white shadow'
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          🎉 Aniversários
        </button>
      </div>

      {/* Conteúdo da Aba: Presenças */}
      {abaAtiva === 'presencas' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden space-y-4">
            <div className="p-4 border-b border-gray-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Registar Presenças ({alunos.length} Atletas)</h2>
              
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-600">Data:</span>
                  <input
                    type="date"
                    value={dataPresenca}
                    onChange={(e) => mudarDataPresenca(e.target.value)}
                    className="p-2 text-xs border border-gray-300 rounded-xl bg-white text-gray-900 font-medium"
                  />
                </div>
                <button
                  onClick={guardarPresencas}
                  disabled={savingPresencas || alunos.length === 0}
                  className="px-4 py-2 bg-blue-950 hover:bg-blue-900 text-white font-bold rounded-xl text-xs shadow transition-all cursor-pointer disabled:opacity-50"
                >
                  {savingPresencas ? 'A guardar...' : '💾 Guardar Presenças'}
                </button>
                <button
                  onClick={removerPresencasData}
                  disabled={savingPresencas || alunos.length === 0}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs shadow transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  🗑️ Remover Presenças (Data)
                </button>
              </div>
            </div>

            {sucessoPresencas && (
              <div className="mx-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-xl">
                {sucessoPresencas}
              </div>
            )}

            {alunos.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-500">Ainda não existem atletas registados nesta turma.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                      <th className="p-4">Nome do Atleta</th>
                      <th className="p-4">Data de Nascimento</th>
                      <th className="p-4">Escalão</th>
                      <th className="p-4">Graduação</th>
                      <th className="p-4 text-center">Estado (Presente / Faltou / -)</th>
                      <th className="p-4 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {alunos.map((aluno) => {
                      const estadoAtual = presencas[aluno.id];
                      return (
                        <tr key={aluno.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 font-bold text-gray-900">{aluno.nome}</td>
                          <td className="p-4 text-gray-600">
                            <input
                              type="date"
                              value={aluno.data_nascimento || ''}
                              onChange={(e) => alterarDataNascimentoAtleta(aluno.id, e.target.value)}
                              className="p-2 text-xs border border-slate-200 rounded-xl bg-white text-slate-800 font-medium shadow-sm focus:ring-blue-950 cursor-pointer"
                            />
                          </td>
                          <td className="p-4 text-gray-600">
                            <span className="px-2 py-1 bg-blue-50 text-blue-700 font-bold rounded-lg border border-blue-100">
                              {aluno.escalao || 'Geral'}
                            </span>
                          </td>
                          <td className="p-4 text-gray-600">
                            <select
                              value={aluno.graduacao || 'Branco'}
                              onChange={(e) => alterarGraduacaoAtleta(aluno.id, e.target.value)}
                              className="p-2 text-xs border border-slate-200 rounded-xl bg-white text-slate-800 font-bold shadow-sm focus:ring-blue-950 cursor-pointer"
                            >
                              {LISTA_GRADUACOES.map((g) => (
                                <option key={g} value={g}>{g}</option>
                              ))}
                            </select>
                          </td>
                          <td className="p-4 text-center">
                            <div className="inline-flex items-center gap-1.5 bg-gray-50 p-1 rounded-xl border border-gray-200">
                              <button
                                type="button"
                                onClick={() => definirEstadoPresenca(aluno.id, true)}
                                className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                                  estadoAtual === true
                                    ? 'bg-emerald-600 text-white shadow-sm'
                                    : 'text-emerald-700 hover:bg-emerald-50'
                                }`}
                              >
                                Presente
                              </button>
                              
                              <button
                                type="button"
                                onClick={() => definirEstadoPresenca(aluno.id, false)}
                                className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                                  estadoAtual === false
                                    ? 'bg-red-600 text-white shadow-sm'
                                    : 'text-red-700 hover:bg-red-50'
                                }`}
                              >
                                Faltou
                              </button>

                              <button
                                type="button"
                                onClick={() => definirEstadoPresenca(aluno.id, null)}
                                className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                                  estadoAtual === null || estadoAtual === undefined
                                    ? 'bg-gray-700 text-white shadow-sm'
                                    : 'text-gray-600 hover:bg-gray-200'
                                }`}
                              >
                                -
                              </button>
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <button
                              type="button"
                              onClick={() => removerAtleta(aluno.id, aluno.nome)}
                              title="Remover Atleta"
                              className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Histórico de Presenças Registadas */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden space-y-4">
            <div className="p-4 border-b border-gray-100 bg-slate-50/50">
              <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Histórico de Presenças Registadas</h2>
            </div>

            {historicoPresencas.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-500">Ainda não existem registos de presenças guardados.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                      <th className="p-4">Data</th>
                      <th className="p-4">Atleta</th>
                      <th className="p-4 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {historicoPresencas.map((registo) => (
                      <tr key={registo.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 font-bold text-gray-900">📅 {registo.data}</td>
                        <td className="p-4 font-bold text-gray-800">{registo.alunos?.nome || 'Atleta'}</td>
                        <td className="p-4 text-center">
                          {registo.presente === true ? (
                            <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Presente
                            </span>
                          ) : registo.presente === false ? (
                            <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-red-50 text-red-700 border border-red-200">
                              Faltou
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                              -
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Conteúdo da Aba: Aniversários */}
      {abaAtiva === 'aniversarios' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-sm font-black text-gray-900 uppercase tracking-wider">Aniversários dos Atletas</h2>
            <p className="text-xs text-gray-500 mt-0.5">Lista organizada por mês (de Janeiro a Dezembro).</p>
          </div>

          {MESES.map((mes) => {
            // Filtrar atletas que fazem anos neste mês
            const atletasDoMes = alunos.filter((aluno) => {
              if (!aluno.data_nascimento) return false;
              const partes = aluno.data_nascimento.split('-');
              if (partes.length < 2) return false;
              const mesNasc = parseInt(partes[1], 10);
              return mesNasc === mes.id;
            });

            // Opcional: Se quiser mostrar apenas os meses que têm aniversariantes, pode remover a condição abaixo, 
            // mas mostrar todos em formato de secção sequencial é o aspeto ideal. Vamos mostrar todos ou apenas os que têm? 
            // Mostramos todos para manter a estrutura completa, ou omitimos se vazio? O melhor é listar todos os meses sequencialmente.
            
            return (
              <div key={mes.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                <div className="inline-block px-3 py-1 bg-red-50 border border-red-100 text-red-600 text-xs font-black uppercase tracking-wider rounded-lg">
                  {mes.nome}
                </div>

                {atletasDoMes.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">Nenhum aniversariante em {mes.nome}.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {atletasDoMes.map((aluno) => {
                      const partesData = aluno.data_nascimento ? aluno.data_nascimento.split('-') : [];
                      const diaMesFormatado = partesData.length === 3 ? `${partesData[2]}/${partesData[1]}` : aluno.data_nascimento;

                      return (
                        <div key={aluno.id} className="p-4 rounded-xl border border-gray-100 bg-slate-50/50 flex items-center justify-between gap-3 shadow-xs">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-blue-950/10 flex items-center justify-center text-blue-950 font-black text-xs">
                              {aluno.nome.charAt(0)}
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-gray-900 line-clamp-1">{aluno.nome}</h4>
                              <p className="text-[11px] text-gray-500">Nascimento: {aluno.data_nascimento || 'Não definida'}</p>
                            </div>
                          </div>
                          <span className="px-2.5 py-1 bg-red-50 border border-red-200 text-red-700 text-[11px] font-bold rounded-lg whitespace-nowrap">
                            🎂 {diaMesFormatado}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}