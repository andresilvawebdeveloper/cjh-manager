import Link from 'next/link';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Cabeçalho de Boas-Vindas com o Logótipo exigido */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <img src="/logo-clube.png" alt="Logo do Clube de Judo Hajime" className="h-14 w-auto object-contain" />
          <div>
            <h1 className="text-2xl font-black text-gray-900">Painel do Treinador</h1>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Gestão da Época 2026/2027</p>
          </div>
        </div>
      </div>

      {/* Grelha de Acessos Rápidos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Botão de Centros */}
        <Link 
          href="/dashboard/centros"
          className="p-6 bg-white hover:bg-blue-50/50 border border-gray-100 rounded-2xl shadow-sm transition-all group flex flex-col justify-between space-y-4"
        >
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 font-bold group-hover:bg-blue-600 group-hover:text-white transition-all">
            📍
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">Centros e Turmas</h2>
            <p className="text-xs text-gray-500 mt-1">Gerir pavilhões, polos de treino e as respetivas turmas.</p>
          </div>
        </Link>

        {/* Botão de Alunos */}
        <Link 
          href="/dashboard/alunos/novo"
          className="p-6 bg-white hover:bg-blue-50/50 border border-gray-100 rounded-2xl shadow-sm transition-all group flex flex-col justify-between space-y-4"
        >
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 font-bold group-hover:bg-blue-600 group-hover:text-white transition-all">
            🥋
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">Registar Atleta</h2>
            <p className="text-xs text-gray-500 mt-1">Adicionar novos judocas com cálculo automático de escalão.</p>
          </div>
        </Link>
      </div>
    </div>
  );
}