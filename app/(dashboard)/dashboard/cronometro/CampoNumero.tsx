'use client';

import { useEffect, useState } from 'react';

interface Props {
  valor: number;
  min: number;
  max: number;
  passo?: number;
  disabled?: boolean;
  onChange: (n: number) => void;
}

/**
 * Campo numérico com botões − e +.
 * Enquanto se escreve, aceita o texto tal como está (até vazio); o valor só é
 * corrigido para o intervalo permitido ao sair do campo.
 */
export default function CampoNumero({ valor, min, max, passo = 1, disabled, onChange }: Props) {
  const [texto, setTexto] = useState(String(valor));

  // Atualizar quando o valor muda por fora (ex: botões 1 min / 2 min)
  useEffect(() => {
    setTexto(String(valor));
  }, [valor]);

  const limitar = (n: number) => Math.max(min, Math.min(max, Math.round(n)));

  function confirmar() {
    const n = texto.trim() === '' ? valor : limitar(Number(texto));
    setTexto(String(n));
    if (n !== valor) onChange(n);
  }

  function escrever(t: string) {
    if (!/^\d*$/.test(t)) return;
    setTexto(t);
    // Atualiza já se o número escrito for válido, sem forçar nada enquanto se escreve
    if (t !== '' && Number(t) >= min && Number(t) <= max) onChange(Number(t));
  }

  function somar(d: number) {
    const n = limitar((Number(texto) || 0) + d);
    setTexto(String(n));
    onChange(n);
  }

  const botao =
    'w-11 shrink-0 flex items-center justify-center text-lg font-black text-gray-700 bg-gray-50 hover:bg-gray-100 disabled:opacity-40';

  return (
    <div className={`flex items-stretch border border-gray-200 rounded-xl overflow-hidden bg-white ${disabled ? 'opacity-50' : ''}`}>
      <button type="button" onClick={() => somar(-passo)} disabled={disabled || valor <= min} className={botao} aria-label="Diminuir">
        −
      </button>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={texto}
        disabled={disabled}
        onChange={(e) => escrever(e.target.value)}
        onBlur={confirmar}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        onFocus={(e) => e.target.select()}
        className="w-full min-w-0 text-center py-2.5 text-sm font-bold text-gray-900 bg-white focus:outline-none"
      />
      <button type="button" onClick={() => somar(passo)} disabled={disabled || valor >= max} className={botao} aria-label="Aumentar">
        +
      </button>
    </div>
  );
}
