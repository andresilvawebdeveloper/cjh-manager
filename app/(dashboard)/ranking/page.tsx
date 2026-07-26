import React from 'react';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard CJH</h2>
        <p className="text-gray-500">Bem-vindo, Treinador.</p>
      </header>

      {/* Smart Dashboard */}
      <section className="bg-blue-50 border border-blue-200 p-6 rounded-xl shadow-sm">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Turma Atual</h3>
        <p className="text-blue-700">A detetar turma baseada no horário...</p>
        <div className="mt-4 flex gap-3">
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700">
            Fazer Check-in
          </button>
        </div>
      </section>

      {/* Lembretes e Atalhos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <section className="p-4 border border-gray-200 rounded-lg">
          <h4 className="font-semibold text-gray-800 mb-2">Aniversariantes</h4>
          <p className="text-sm text-gray-500">Nenhum alerta para os próximos dias.</p>
        </section>

        <section className="p-4 border border-gray-200 rounded-lg">
          <h4 className="font-semibold text-gray-800 mb-2">Gestão Rápida</h4>
          <ul className="text-sm text-blue-600 space-y-2">
            <li><a href="/ranking" className="hover:underline font-bold">🏆 Ver Ranking do Clube</a></li>
            <li><a href="/relatorios" className="hover:underline">Exportar Relatório de Presenças</a></li>
            <li><a href="/relatorios" className="hover:underline">Exportar Relatório de Kits</a></li>
          </ul>
        </section>
      </div>
    </div>
  );
}