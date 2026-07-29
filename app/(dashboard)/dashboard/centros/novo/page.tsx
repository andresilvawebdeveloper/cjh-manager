'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../../../lib/supabase/client';

export default function NovoCentroPage() {
  const router = useRouter();
  const [nome, setNome] = useState('');
  const [emailsTreinadores, setEmailsTreinadores] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  const criarCentro = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErro('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilizador não autenticado.');
      if (!user.email) throw new Error('Email do utilizador não encontrado.');

      // 1. Inserir o centro na tabela centros
      const { data: centroData, error: centroError } = await supabase
        .from('centros')
        .insert([
          {
            nome,
            treinador_id: user.id, // Mantém o criador original
          }
        ])
        .select()
        .single();

      if (centroError) throw centroError;
      const centroId = centroData.id;

      // 2. Preparar lista de emails com acesso (o próprio criador + outros emails separados por vírgula ou linha)
      const listaEmails = new Set<string>();
      listaEmails.add(user.email.trim().toLowerCase());

      if (emailsTreinadores.trim()) {
        emailsTreinadores
          .split(/[\n,]/) // Divide por vírgula ou quebra de linha
          .map(e => e.trim().toLowerCase())
          .filter(e => e.length > 0)
          .forEach(e => listaEmails.add(e));
      }

      // 3. Inserir os registos na tabela de associação 'centro_treinadores'
      const registosAcesso = Array.from(listaEmails).map(email => ({
        centro_id: centroId,
        email: email
      }));

      const { error: acessoError } = await supabase
        .from('centro_treinadores')
        .insert(registosAcesso);

      if (acessoError) throw acessoError;

      router.push('/dashboard/centros');
      router.refresh();
    } catch (err: any) {
      setErro('Erro ao criar centro: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded-2xl shadow-sm border border-gray-100 space-y-6">
      <div>
        <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Gestão de Instalações</span>
        <h1 className="text-2xl font-black text-gray-900 mt-1">Adicionar Novo Centro</h1>
      </div>

      {erro && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl">
          {erro}
        </div>
      )}

      <form onSubmit={criarCentro} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nome do Centro / Pavilhão</label>
          <input
            type="text"
            required
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: Pavilhão Municipal"
            className="w-full p-3 text-xs border border-gray-300 rounded-xl focus:ring-blue-500 bg-white text-gray-900"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Emails dos Treinadores com Acesso (opcional)</label>
          <textarea
            value={emailsTreinadores}
            onChange={(e) => setEmailsTreinadores(e.target.value)}
            placeholder="Insira os emails separados por vírgula ou linha (ex: treinador1@clube.com, treinador2@clube.com)"
            rows={3}
            className="w-full p-3 text-xs border border-gray-300 rounded-xl focus:ring-blue-500 bg-white text-gray-900"
          />
          <p className="text-[11px] text-gray-500 mt-1">O seu email terá acesso automático. Os restantes treinadores aqui indicados também poderão ver e gerir este centro.</p>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-3 bg-blue-950 hover:bg-blue-900 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? 'A guardar...' : '💾 Guardar Centro'}
          </button>
        </div>
      </form>
    </div>
  );
}