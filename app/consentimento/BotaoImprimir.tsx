'use client';

export default function BotaoImprimir() {
  return (
    <button
      onClick={() => window.print()}
      className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl text-xs shadow"
    >
      🖨️ Imprimir formulário
    </button>
  );
}
