'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../../../lib/supabase/client';

interface HorarioInput {
  dia_semana: string;
  hora_inicio: string;
  hora_fim: string;
}

interface Horario {
  id: number;
  dia_semana: string;
  hora_inicio: string;
  hora_fim: string;
}

interface Turma {
  id: number;
  nome: string;
  turma_horarios: Horario[];
}

interface Centro {
  id: number;
  nome: string;
}

export default function CentroDetalhePage({ params }: { params: Promise<{ centroId: string }> }) {
  const resolvedParams = use(params);
  const centroId = resolvedParams.centroId;
  const router = useRouter();

  const [centro, setCentro] = useState<Centro | null>(null);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados para o formulário de nova turma
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nomeTurma, setNomeTurma] = useState('');
  const [horarios, setHorarios] = useState<HorarioInput[]>([{ dia_semana: 'Segunda-feira', hora_inicio: '18:00', hora_fim: '19:00' }]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    carregarDadosCentro();
  }, [centroId]);

  async function carregarDadosCentro() {
    if (!centroId) return;

    try {
      setLoading(true);
      // 1. Buscar detalhes do centro
      const { data: centroData, error: centroError } = await supabase
        .from('centros')
        .select('*')
        .eq('id', centroId)
        .single();

      if (centroError) throw centroError;
      setCentro(centroData);

      // 2. Buscar turmas e respetivos horários associados a este centro
      const { data: turmasData, error: turmasError } = await supabase
        .from('turmas')
        .select(`
          id,
          nome,
          turma_horarios (
            id,
            dia_semana,
            hora_inicio,
            hora_fim
          )
        `)
        .eq('centro_id', centroId);

      if (turmasError) throw turmasError;
      setTurmas(turmasData || []);
    } catch (err) {
      console.error('Erro ao carregar dados do centro:', err);
    } finally {
      setLoading(false);
    }
  }

  const adicionarLinhaHorario = () => {
    setHorarios([...horarios, { dia_semana: 'Terça-feira', hora_inicio: '18:00', hora_fim: '19:00' }]);
  };

  const removerLinhaHorario = (index: number) => {
    setHorarios(horarios.filter((_, i) => i !== index));
  };

  const atualizarHorario = (index: number, campo: keyof HorarioInput, valor: string) => {
    const novosHorarios = [...horarios];
    novosHorarios[index][campo] = valor;
    setHorarios(novosHorarios);
  };

  const criarTurma = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErro('');

    try {
      // 1. Inserir a turma associada a este centro
      const { data: turmaInserida, error: turmaError } = await supabase
        .from('turmas')
        .insert([
          {
            nome: nomeTurma,
            centro_id: Number(centroId),
          }
        ])
        .select()
        .single();

      if (turmaError) throw turmaError;

      // 2. Inserir os horários associados à nova turma
      if (horarios.length > 0 && turmaInserida) {
        const horariosParaInserir = horarios.map((h) => ({
          turma_id: turmaInserida.id,
          dia_semana: h.dia_semana,
          hora_inicio: h.hora_inicio,
          hora_fim: h.hora_fim,
        }));

        const { error: horarioError } = await supabase
          .from('turma_horarios')
          .insert(horariosParaInserir);

        if (horarioError) throw horarioError;
      }

      // Limpar formulário e recarregar dados
      setNomeTurma('');
      setHorarios([{ dia_semana: 'Segunda-feira', hora_inicio: '18:00', hora_fim: '19:00' }]);
      setMostrarForm(false);
      carregarDadosCentro();
    } catch (err: any) {
      setErro('Erro ao criar turma: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const removerCentro = async () => {
    if (!confirm('Tem a certeza de que pretende remover este centro? Todas as turmas e dados associados poderão ser eliminados.')) {
      return;
    }

    setDeleting(true);
    setErro('');

    try {
      const { error } = await supabase
        .from('centros')
        .delete()
        .eq('id', centroId);

      if (error) throw error;

      router.push('/dashboard/centros');
      router.refresh();
    } catch (err: any) {
      setErro('Erro ao remover centro: ' + err.message);
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 bg-white rounded-2xl border border-gray-100 text-center text-xs font-medium text-gray-500">
        A carregar dados do centro...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/dashboard/centros" className="text-xs font-bold text-gray-500 hover:text-blue-600 block mb-2">← Voltar aos Centros</Link>
          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Centro de Treino</span>
          <h1 className="text-2xl font-black text-gray-900 mt-1">{centro?.nome || 'Centro'}</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={removerCentro}
            disabled={deleting}
            className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-xl text-xs border border-red-200 transition-all cursor-pointer disabled:opacity-50"
          >
            {deleting ? 'A apagar...' : '🗑️ Apagar Centro'}
          </button>

          <button
            onClick={() => setMostrarForm(!mostrarForm)}
            className="px-4 py-2.5 bg-blue-950 hover:bg-blue-900 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center gap-2"
          >
            {mostrarForm ? '✕ Fechar Formulário' : '＋ Criar Nova Turma'}
          </button>
        </div>
      </div>

      {erro && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl">
          {erro}
        </div>
      )}

      {/* Formulário para Criar Turma e Horários */}
      {mostrarForm && (
        <div className="bg-white p-6 rounded-2xl border border-blue-900/10 shadow-lg space-y-4 transition-all">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Adicionar Turma e Horários</h2>

          <form onSubmit={criarTurma} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nome da Turma</label>
              <input
                type="text"
                required
                value={nomeTurma}
                onChange={(e) => setNomeTurma(e.target.value)}
                placeholder="Ex: Turma Competição / Iniciação"
                className="w-full p-3 text-xs border border-gray-300 rounded-xl focus:ring-blue-900 bg-white text-gray-900"
              />
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-700 uppercase">Horários da Turma</label>
                <button
                  type="button"
                  onClick={adicionarLinhaHorario}
                  className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                >
                  ＋ Adicionar outro horário
                </button>
              </div>

              {horarios.map((h, index) => (
                <div key={index} className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 rounded-xl border border-gray-200">
                  <select
                    value={h.dia_semana}
                    onChange={(e) => atualizarHorario(index, 'dia_semana', e.target.value)}
                    className="p-2.5 text-xs border border-gray-300 rounded-lg bg-white text-gray-900 flex-1 min-w-[130px]"
                  >
                    <option value="Segunda-feira">Segunda-feira</option>
                    <option value="Terça-feira">Terça-feira</option>
                    <option value="Quarta-feira">Quarta-feira</option>
                    <option value="Quinta-feira">Quinta-feira</option>
                    <option value="Sexta-feira">Sexta-feira</option>
                    <option value="Sábado">Sábado</option>
                    <option value="Domingo">Domingo</option>
                  </select>

                  <input
                    type="time"
                    required
                    value={h.hora_inicio}
                    onChange={(e) => atualizarHorario(index, 'hora_inicio', e.target.value)}
                    className="p-2.5 text-xs border border-gray-300 rounded-lg bg-white text-gray-900"
                  />

                  <input
                    type="time"
                    required
                    value={h.hora_fim}
                    onChange={(e) => atualizarHorario(index, 'hora_fim', e.target.value)}
                    className="p-2.5 text-xs border border-gray-300 rounded-lg bg-white text-gray-900"
                  />

                  {horarios.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removerLinhaHorario(index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg text-xs font-bold cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={() => setMostrarForm(false)}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-blue-950 hover:bg-blue-900 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {saving ? 'A guardar...' : '💾 Guardar Turma'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Listagem de Turmas */}
      {turmas.length === 0 ? (
        <div className="p-8 bg-white rounded-2xl border border-gray-100 text-center text-gray-500 text-xs">
          Ainda não existem turmas registadas para este centro. Clique em &quot;Criar Nova Turma&quot; acima.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {turmas.map((turma) => (
            <div
              key={turma.id}
              className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm flex flex-col justify-between space-y-4"
            >
              <div>
                <h2 className="text-lg font-bold text-gray-900">{turma.nome}</h2>
                
                <div className="mt-3 space-y-1.5">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Horários Atribuídos:</span>
                  {turma.turma_horarios && turma.turma_horarios.length > 0 ? (
                    turma.turma_horarios.map((h) => (
                      <div key={h.id} className="text-xs font-medium text-gray-700 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 flex items-center justify-between">
                        <span>📅 {h.dia_semana}</span>
                        <span className="text-blue-600 font-bold">🕒 {h.hora_inicio.slice(0, 5)} - {h.hora_fim.slice(0, 5)}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-400 italic">Sem horários definidos.</p>
                  )}
                </div>
              </div>

              <div className="pt-2">
                <Link
                  href={`/dashboard/turmas/${turma.id}`}
                  className="w-full block text-center py-2.5 px-4 bg-gray-900 hover:bg-blue-600 text-white font-bold rounded-xl text-xs transition-all cursor-pointer"
                >
                  Ver Alunos da Turma
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}