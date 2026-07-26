'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../../../lib/supabase/client';
import Link from 'next/link';

interface HorarioInput {
  diaSemana: string;
  horaInicio: string;
  horaFim: string;
}

interface TurmaInput {
  nome: string;
  horarios: HorarioInput[];
}

const diasDaSemana = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
  'Domingo',
];

export default function NovoCentroPage() {
  const router = useRouter();
  const [nomeCentro, setNomeCentro] = useState('');
  const [turmas, setTurmas] = useState<TurmaInput[]>([
    {
      nome: '',
      horarios: [{ diaSemana: 'Segunda-feira', horaInicio: '18:00', horaFim: '19:30' }],
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  const adicionarTurma = () => {
    setTurmas([
      ...turmas,
      {
        nome: '',
        horarios: [{ diaSemana: 'Segunda-feira', horaInicio: '18:00', horaFim: '19:30' }],
      },
    ]);
  };

  const atualizarNomeTurma = (indexTurma: number, nome: string) => {
    const novasTurmas = [...turmas];
    novasTurmas[indexTurma].nome = nome;
    setTurmas(novasTurmas);
  };

  const removerTurma = (indexTurma: number) => {
    setTurmas(turmas.filter((_, i) => i !== indexTurma));
  };

  const adicionarHorario = (indexTurma: number) => {
    const novasTurmas = [...turmas];
    novasTurmas[indexTurma].horarios.push({ diaSemana: 'Terça-feira', horaInicio: '18:00', horaFim: '19:30' });
    setTurmas(novasTurmas);
  };

  const atualizarHorario = (indexTurma: number, indexHorario: number, campo: keyof HorarioInput, valor: string) => {
    const novasTurmas = [...turmas];
    novasTurmas[indexTurma].horarios[indexHorario][campo] = valor;
    setTurmas(novasTurmas);
  };

  const removerHorario = (indexTurma: number, indexHorario: number) => {
    const novasTurmas = [...turmas];
    novasTurmas[indexTurma].horarios = novasTurmas[indexTurma].horarios.filter((_, i) => i !== indexHorario);
    setTurmas(novasTurmas);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErro('');

    try {
      // 1. Inserir o Centro
      const { data: centroData, error: centroError } = await supabase
        .from('centros')
        .insert([{ nome: nomeCentro }])
        .select()
        .single();

      if (centroError) throw centroError;
      const centroId = centroData.id;

      // 2. Inserir as Turmas e respetivos Horários Múltiplos
      for (const turma of turmas) {
        const { data: turmaData, error: turmaError } = await supabase
          .from('turmas')
          .insert([{ centro_id: centroId, nome: turma.nome }])
          .select()
          .single();

        if (turmaError) throw turmaError;
        const turmaId = turmaData.id;

        if (turma.horarios.length > 0) {
          const horariosParaInserir = turma.horarios.map((h) => ({
            turma_id: turmaId,
            dia_semana: h.diaSemana,
            hora_inicio: h.horaInicio,
            hora_fim: h.horaFim,
          }));

          const { error: horariosError } = await supabase.from('turma_horarios').insert(horariosParaInserir);
          if (horariosError) throw horariosError;
        }
      }

      router.push('/dashboard/centros');
      router.refresh();
    } catch (err: any) {
      setErro('Erro ao guardar centro e turmas: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-2xl shadow-sm border border-gray-100 my-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-gray-900">Adicionar Centro e Turmas Múltiplas</h1>
        <Link href="/dashboard/centros" className="text-xs font-bold text-blue-600 hover:underline">
          ← Voltar
        </Link>
      </div>

      {erro && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">{erro}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nome do Centro / Pavilhão</label>
          <input
            type="text"
            required
            value={nomeCentro}
            onChange={(e) => setNomeCentro(e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            placeholder="Ex: Pavilhão Sede - Hajime"
          />
        </div>

        <div className="space-y-6 border-t border-gray-100 pt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Turmas do Centro</h2>
            <button
              type="button"
              onClick={adicionarTurma}
              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-bold rounded-lg transition-all cursor-pointer"
            >
              + Adicionar Turma
            </button>
          </div>

          {turmas.map((turma, indexTurma) => (
            <div key={indexTurma} className="p-5 bg-gray-50 border border-gray-200 rounded-xl space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-600 uppercase">Turma #{indexTurma + 1}</span>
                {turmas.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removerTurma(indexTurma)}
                    className="text-red-500 hover:text-red-700 text-xs font-bold cursor-pointer"
                  >
                    Remover Turma
                  </button>
                )}
              </div>

              <input
                type="text"
                required
                value={turma.nome}
                onChange={(e) => atualizarNomeTurma(indexTurma, e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                placeholder="Nome da Turma (ex: Competição)"
              />

              {/* Lista de Horários desta Turma */}
              <div className="space-y-3 pt-2 border-t border-gray-200/60">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-gray-500 uppercase">Horários de Treino (Dias e Horas)</span>
                  <button
                    type="button"
                    onClick={() => adicionarHorario(indexTurma)}
                    className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    + Adicionar Outro Dia/Horário
                  </button>
                </div>

                {turma.horarios.map((horario, indexHorario) => (
                  <div key={indexHorario} className="flex items-center gap-2 bg-white p-3 rounded-lg border border-gray-200">
                    <select
                      value={horario.diaSemana}
                      onChange={(e) => atualizarHorario(indexTurma, indexHorario, 'diaSemana', e.target.value)}
                      className="px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs text-gray-900"
                    >
                      {diasDaSemana.map((dia) => (
                        <option key={dia} value={dia}>{dia}</option>
                      ))}
                    </select>

                    <input
                      type="time"
                      required
                      value={horario.horaInicio}
                      onChange={(e) => atualizarHorario(indexTurma, indexHorario, 'horaInicio', e.target.value)}
                      className="px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs text-gray-900"
                    />

                    <span className="text-xs text-gray-400">até</span>

                    <input
                      type="time"
                      required
                      value={horario.horaFim}
                      onChange={(e) => atualizarHorario(indexTurma, indexHorario, 'horaFim', e.target.value)}
                      className="px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs text-gray-900"
                    />

                    {turma.horarios.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removerHorario(indexTurma, indexHorario)}
                        className="text-red-500 hover:text-red-700 font-bold text-xs ml-auto"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 transition-all text-sm cursor-pointer disabled:opacity-50"
        >
          {loading ? 'A guardar centro e horários...' : 'Guardar Centro'}
        </button>
      </form>
    </div>
  );
}