import React from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Cabeçalho superior do Dashboard */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-xs">
        <div className="flex items-center space-x-3">
          <img src="/logo-clube.png" alt="Logo" className="h-10 w-auto object-contain" />
          <span className="font-black text-gray-900 tracking-tight text-lg">CJH Manager</span>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-xs font-bold text-gray-500 uppercase">Área de Treinador</span>
        </div>
      </header>

      {/* Conteúdo Principal onde as páginas do dashboard são renderizadas */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
        {children}
      </main>
    </div>
  );
}