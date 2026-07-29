'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../../../../lib/supabase/client';

export default function PerfilPage() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [novaPassword, setNovaPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [savingPerfil, setSavingPerfil] = useState(false);
  const [savingPass, setSavingPass] = useState(false);
  
  const [mensagemPerfil, setMensagemPerfil] = useState({ texto: '', tipo: '' });
  const [mensagemPass, setMensagemPass] = useState({ texto: '', tipo: '' });

  useEffect(() => {
    carregarDadosUtilizador();
  }, []);

  const carregarDadosUtilizador = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setEmail(user.email || '');
        // Pode ir buscar o nome a uma tabela de perfis ou metadados
        setNome(user.user_metadata?.nome || '');
      }
    } catch (err) {
      console.error('Erro ao carregar utilizador:', err);
    } finally {
      setLoading(false);
    }
  };

  const atualizarPerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPerfil(true);
    setMensagemPerfil({ texto: '', tipo: '' });

    try {
      // Atualizar Email e/ou metadados no Supabase Auth
      const { error } = await supabase.auth.updateUser({
        email: email,
        data: { nome: nome }
      });

      if (error) throw error;
      setMensagemPerfil({ texto: 'Perfil atualizado com sucesso!', tipo: 'sucesso' });
    } catch (err: any) {
      setMensagemPerfil({ texto: 'Erro ao atualizar perfil: ' + err.message, tipo: 'erro' });
    } finally {
      setSavingPerfil(false);
    }
  };

  const alterarPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (novaPassword.length < 6) {
      setMensagemPass({ texto: 'A nova password deve ter pelo menos 6 caracteres.', tipo: 'erro' });
      return;
    }
    if (novaPassword !== confirmarPassword) {
      setMensagemPass({ texto: 'As passwords não coincidem.', tipo: 'erro' });
      return;
    }

    setSavingPass(true);
    setMensagemPass({ texto: '', tipo: '' });

    try {
      const { error } = await supabase.auth.updateUser({
        password: novaPassword
      });

      if (error) throw error;
      setMensagemPass({ texto: 'Password alterada com sucesso!', tipo: 'sucesso' });
      setNovaPassword('');
      setConfirmarPassword('');
    } catch (err: any) {
      setMensagemPass({ texto: 'Erro ao alterar password: ' + err.message, tipo: 'erro' });
    } finally {
      setSavingPass(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-xs text-gray-500">A carregar dados do perfil...</div>;

  return (
    <div className="space-y-6 max-w-2xl mx-auto p-6">
      <div>
        <Link href="/dashboard" className="text-xs font-bold text-gray-500 hover:text-blue-600 block mb-2">← Voltar ao Dashboard</Link>
        <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Gestão de Conta</span>
        <h1 className="text-2xl font-black text-gray-900 mt-1">Área do Treinador - Perfil</h1>
      </div>

      {/* SECÇÃO DE DADOS PESSOAIS (NOME E EMAIL) */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Informações Pessoais</h2>
        
        {mensagemPerfil.texto && (
          <div className={`p-3 rounded-xl text-xs font-bold ${mensagemPerfil.tipo === 'sucesso' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {mensagemPerfil.texto}
          </div>
        )}

        <form onSubmit={atualizarPerfil} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nome</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="O seu nome"
              className="w-full p-2.5 text-xs border border-gray-300 rounded-xl focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="O seu email"
              className="w-full p-2.5 text-xs border border-gray-300 rounded-xl focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingPerfil}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {savingPerfil ? 'A guardar...' : '💾 Guardar Alterações'}
            </button>
          </div>
        </form>
      </div>

      {/* SECÇÃO DE ALTERAÇÃO DE PASSWORD */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Segurança (Alterar Password)</h2>

        {mensagemPass.texto && (
          <div className={`p-3 rounded-xl text-xs font-bold ${mensagemPass.tipo === 'sucesso' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {mensagemPass.texto}
          </div>
        )}

        <form onSubmit={alterarPassword} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nova Password</label>
            <input
              type="password"
              required
              value={novaPassword}
              onChange={(e) => setNovaPassword(e.target.value)}
              placeholder="Mínimo de 6 caracteres"
              className="w-full p-2.5 text-xs border border-gray-300 rounded-xl focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Confirmar Nova Password</label>
            <input
              type="password"
              required
              value={confirmarPassword}
              onChange={(e) => setConfirmarPassword(e.target.value)}
              placeholder="Repita a nova password"
              className="w-full p-2.5 text-xs border border-gray-300 rounded-xl focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingPass}
              className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {savingPass ? 'A atualizar...' : '🔒 Alterar Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}