'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { calcularEscalao } from '../../../../../lib/supabase/escaloes';
import { supabase } from '../../../../../lib/supabase/client'; // Ajuste o caminho se necessário para o seu client do supabase

export default function NovoAlunoPage() {
  const router = useRouter();
  const [nome, setNome] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [graduacao, setGraduacao] = useState('Cinto Branco');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  // Calcula o escalão automaticamente sempre que a data de nascimento muda
  const escalaoCalculado = dataNascimento ? calcularEscalao(dataNascimento) : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErro('');

    try {
      const { error } = await supabase.from('alunos').insert([
        {
          nome,
          data_nascimento: dataNascimento,
          graduacao,
          escalao: escalaoCalculado,
        },
      ]);

      if (error) throw error;

      // Redireciona para a lista de alunos ou dashboard após sucesso
      router.push('/dashboard');
    } catch (err: any) {
      setErro('Erro ao guardar o aluno: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded-2xl shadow-sm border border-gray-100 my-8">
      <h1 className="text-2xl font-black text-gray-900 mb-6">Registar Novo Atleta</h1>

      {erro && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
          {erro}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nome Completo</label>
          <input
            type="text"
            required
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
            placeholder="Nome do judoca"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Data de Nascimento</label>
          <input
            type="date"
            required
            value={dataNascimento}
            onChange={(e) => setDataNascimento(e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Escalão (Calculado Automaticamente)</label>
          <input
            type="text"
            disabled
            value={escalaoCalculado || 'Selecione a data de nascimento'}
            className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-gray-600 text-sm font-semibold cursor-not-allowed"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Graduação (Cinto)</label>
          <select
            value={graduacao}
            onChange={(e) => setGraduacao(e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
          >
            <option value="Cinto Branco">Cinto Branco (6º Kyu)</option>
            <option value="Branco-Amarelo">Cinto Branco-Amarelo</option>
            <option value="Cinto Amarelo">Cinto Amarelo (5º Kyu)</option>
            <option value="Amarelo-Laranja">Cinto Amarelo-Laranja</option>
            <option value="Cinto Laranja">Cinto Laranja (4º Kyu)</option>
            <option value="Laranja-Verde">Cinto Laranja-Verde</option>
            <option value="Cinto Verde">Cinto Verde (3º Kyu)</option>
            <option value="Cinto Verde">Cinto Verde-Azul</option>
            <option value="Cinto Azul">Cinto Azul (2º Kyu)</option>
            <option value="Cinto Azul">Cinto Azul-Castanho</option>
            <option value="Cinto Castanho">Cinto Castanho (1º Kyu)</option>
            <option value="Cinto Preto">Cinto Preto (1º Dan+)</option>
          </select>
        </div>

        <div className="pt-4 flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-3.5 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 transition-all text-sm cursor-pointer disabled:opacity-50"
          >
            {loading ? 'A guardar...' : 'Guardar Atleta'}
          </button>
        </div>
      </form>
    </div>
  );
}