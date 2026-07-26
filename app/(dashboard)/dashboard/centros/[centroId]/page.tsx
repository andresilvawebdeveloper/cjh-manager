'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../../../../lib/supabase/client';

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

export default function CentroDetalhePage({ params }: { params: { centroId: string } }) {
  const centroId = params.centroId;

  const [centro, setCentro] = useState<Centro | null>(null);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregarDadosCentro() {
      if (!centroId) return;

      try {
        // 1. Buscar detalhes do centro
        const { data: centroData, error: centroError } = await supabase
          .from('centros')
          .select('*')
          .eq('id', centroId)
          .single();

        if (centroError) throw centroError;
        setCentro(centroData);

        // 2. Buscar turmas e os respetivos horários múltiplos associados a este centro
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

    carregarDadosCentro();
  }, [centroId]);

  if (loading) {
    return (
      <div className="p-8 bg-white rounded-2xl border border-gray-100 text-center text-xs font-medium text-gray-500">
        A carregar turmas do centro...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Centro de Treino</span>
          <h1 className="text-2xl font-black text-gray-900 mt-1">{centro?.nome || 'Centro'}</h1>
        </div>
        <Link href="/dashboard/centros" className="text-xs font-bold text-blue-600 hover:underline">
          ← Voltar aos Centros
        </Link>
      </div>

      {turmas.length === 0 ? (
        <div className="p-8 bg-white rounded-2xl border border-gray-100 text-center text-gray-500 text-xs">
          Ainda não existem turmas registadas para este centro.
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
                
                {/* Listagem dos múltiplos horários desta turma */}
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