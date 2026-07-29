'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  const lidarComLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErro('');

    try {
      console.log('A tentar iniciar sessão com:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        console.error('Erro retornado pelo Supabase:', error);
        throw error;
      }

      console.log('Sessão iniciada com sucesso:', data);

      // Forçar redirecionamento e atualização do router
      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      console.error('Catch erro:', err);
      setErro(err.message || 'Erro ao iniciar sessão. Verifique o email e a password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-blue-950 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-blue-900/10 space-y-6">
        <div className="text-center space-y-2">
          <img src="/logo-clube.png" alt="Logo" className="h-16 w-auto mx-auto object-contain" />
          <h1 className="text-xl font-black text-gray-900">Painel do Treinador</h1>
          <p className="text-xs text-gray-400">Introduza as suas credenciais para aceder</p>
        </div>

        {erro && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl whitespace-pre-wrap">
            {erro}
          </div>
        )}

        <form onSubmit={lidarComLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="treinador@exemplo.com"
              className="w-full p-3 text-xs border border-gray-300 rounded-xl focus:ring-blue-900 focus:border-blue-900 bg-white text-gray-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full p-3 text-xs border border-gray-300 rounded-xl focus:ring-blue-900 focus:border-blue-900 bg-white text-gray-900"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-950 hover:bg-blue-900 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? 'A entrar...' : 'Iniciar Sessão'}
          </button>
        </form>
      </div>
    </div>
  );
}