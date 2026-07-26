'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../../../lib/supabase/client';

interface Centro {
  id: number;
  nome: string;
}

export default function CentrosPage() {
  const [centros, setCentros] = useState<Centro[]>([]);
  const [loading, setLoading] = useState(true);

  const carregarCentros = async () => {
    try {
      const { data, error } = await supabase.from('centros').select('*').order('id', { ascending: false });
      if (error) throw error;
      setCentros(data || []);
    } catch (err) {
      console.error('Erro ao carregar centros:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarCentros();
  }, []);

  const eliminarCentro = async (id: number, nome: string, e: React.MouseEvent) => {
    e.preventDefault(); // Evita abrir o link do centro ao clicar no botão
    if (!confirm(`Tem a certeza que deseja eliminar o centro "${nome}" e todas as suas turmas?`)) return;

    try {
      const { error } = await supabase.from('centros').delete().eq('id', id);
      if (error) throw error;
      // Atualiza a lista localmente
      setCentros(centros.filter((c) => c.id !== id));
    } catch (err: any) {
      alert('Erro ao eliminar centro: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Gestão do Clube</span>
          <h1 className="text-2xl font-black text-gray-900 mt-1">Centros de Treino</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/centros/novo"
            className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer"
          >
            + Adicionar Centro
          </Link>
          <Link href="/dashboard" className="text-xs font-bold text-gray-500 hover:text-gray-900">
            Voltar
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="p-8 bg-white rounded-2xl border border-gray-100 text-center text-xs font-medium text-gray-500">
          A carregar centros...
        </div>
      ) : centros.length === 0 ? (
        <div className="p-8 bg-white rounded-2xl border border-gray-100 text-center text-xs text-gray-500">
          Ainda não existem centros registados. Clique em &quot;Adicionar Centro&quot; para começar.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {centros.map((centro) => (
            <Link
              key={centro.id}
              href={`/dashboard/centros/${centro.id}`}
              className="p-6 bg-white hover:shadow-md border border-gray-100 rounded-2xl transition-all flex flex-col justify-between group relative"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Polo Ativo</span>
                  <h2 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors mt-1">
                    {centro.nome}
                  </h2>
                </div>
                <button
                  onClick={(e) => eliminarCentro(centro.id, centro.nome, e)}
                  title="Eliminar Centro"
                  className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer z-10"
                >
                  🗑️
                </button>
              </div>

              <div className="pt-4 flex items-center justify-between text-xs font-bold text-gray-400 group-hover:text-blue-600">
                <span>Ver turmas e horários</span>
                <span>→</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}