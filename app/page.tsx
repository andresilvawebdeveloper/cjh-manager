'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase/client'; // Ajuste o caminho se necessário

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  // Forçar o término de sessão ao entrar na página de login para nunca reter sessões antigas
  useEffect(() => {
    supabase.auth.signOut();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErro('');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Login com sucesso, redireciona para o dashboard
      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setErro('Erro no login: Verifique o seu email e palavra-passe.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-950 to-gray-900 p-4">
      <div className="w-full max-w-sm bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-white/20 space-y-6">
        
        {/* Cabeçalho com Logo */}
        <div className="text-center space-y-3">
          <img src="/logo-clube.png" alt="Logo do Clube de Judo Hajime" className="h-20 w-auto mx-auto object-contain" />
          <div>
            <h1 className="text-2xl font-black tracking-tight text-gray-900">CJH Manager</h1>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mt-1">Área Restrita a Treinadores</p>
          </div>
        </div>

        {erro && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl text-center">
            {erro}
          </div>
        )}

        {/* Formulário de Autenticação */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-700 uppercase">Email</label>
            <input 
              type="email" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
              placeholder="treinador@cjh.pt"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-700 uppercase">Palavra-passe</label>
            <input 
              type="password" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
              placeholder="••••••••"
            />
          </div>

          <div className="pt-2">
            <button 
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center py-3.5 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 transition-all text-sm cursor-pointer disabled:opacity-50"
            >
              {loading ? 'A entrar...' : 'Entrar no Sistema'}
            </button>
          </div>
        </form>

        {/* Rodapé discreto */}
        <div className="text-center pt-2">
          <p className="text-[11px] text-gray-400">Clube de Judo Hajime © 2026/2027</p>
        </div>

      </div>
    </div>
  );
}