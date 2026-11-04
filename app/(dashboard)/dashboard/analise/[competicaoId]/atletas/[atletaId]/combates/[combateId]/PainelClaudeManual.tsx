'use client';

import { useEffect, useRef, useState } from 'react';
import JSZip from 'jszip';
import { extrairFrames } from '../../../../../../../../../lib/extrairFrames';
import { FRAMES_POR_FOLHA, criarFolhasContacto } from '../../../../../../../../../lib/folhasContacto';
import { ContextoCombate, construirPromptManual } from '../../../../../../../../../lib/promptAnalise';
import {
  MANUAL_INTERVALO_MIN,
  MANUAL_MAX_FRAMES,
  RelatorioCombate,
  interpretarRespostaClaude,
} from '../../../../../../../../../lib/analiseIA';

interface Props {
  videoUrl: string;
  contexto: ContextoCombate;
  desativado?: boolean;
  onRelatorio: (relatorio: RelatorioCombate, numFrames: number) => Promise<void>;
  /** Verificação de autorização (RGPD) antes de preparar as imagens para a IA */
  podeAvancar?: () => boolean;
}

type Fase = 'parado' | 'a_extrair' | 'a_montar';

export default function PainelClaudeManual({ videoUrl, contexto, desativado, onRelatorio, podeAvancar }: Props) {
  const [fase, setFase] = useState<Fase>('parado');
  const [progresso, setProgresso] = useState({ feitos: 0, total: 0 });
  const [folhas, setFolhas] = useState<Blob[]>([]);
  const [miniaturas, setMiniaturas] = useState<string[]>([]);
  const [numFrames, setNumFrames] = useState(0);
  const [prompt, setPrompt] = useState('');
  const [copiado, setCopiado] = useState(false);
  const [resposta, setResposta] = useState('');
  const [erro, setErro] = useState('');
  const [aGuardar, setAGuardar] = useState(false);
  const promptRef = useRef<HTMLTextAreaElement>(null);

  // Libertar as miniaturas da memória
  useEffect(() => () => miniaturas.forEach((u) => URL.revokeObjectURL(u)), [miniaturas]);

  const ficheiros = () =>
    folhas.map((b, i) => new File([b], `folha-${String(i + 1).padStart(2, '0')}.jpg`, { type: 'image/jpeg' }));

  async function preparar() {
    if (podeAvancar && !podeAvancar()) return;
    setErro('');
    setCopiado(false);
    try {
      setFase('a_extrair');
      const frames = await extrairFrames(videoUrl, (feitos, total) => setProgresso({ feitos, total }), {
        maxFrames: MANUAL_MAX_FRAMES,
        intervaloMin: MANUAL_INTERVALO_MIN,
        ladoMaior: 640,
      });
      setFase('a_montar');
      const novas = await criarFolhasContacto(frames);
      setFolhas(novas);
      setMiniaturas(novas.map((b) => URL.createObjectURL(b)));
      setNumFrames(frames.length);
      setPrompt(construirPromptManual(contexto, novas.length, FRAMES_POR_FOLHA, frames.length));
    } catch (err: any) {
      setErro('Erro ao preparar as imagens: ' + err.message);
    } finally {
      setFase('parado');
    }
  }

  async function descarregarZip() {
    const zip = new JSZip();
    ficheiros().forEach((f) => zip.file(f.name, f));
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `combate-${contexto.atleta.replace(/\s+/g, '-').toLowerCase()}-imagens.zip`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  const podePartilhar =
    typeof navigator !== 'undefined' && folhas.length > 0 && !!navigator.canShare?.({ files: ficheiros() });

  async function partilhar() {
    try {
      await navigator.share({ files: ficheiros(), title: 'Combate para análise' });
    } catch (err: any) {
      if (err?.name !== 'AbortError') setErro('Não foi possível partilhar: ' + err.message);
    }
  }

  async function copiarPrompt() {
    try {
      await navigator.clipboard.writeText(prompt);
    } catch {
      // Alternativa para browsers sem acesso à área de transferência
      promptRef.current?.select();
      document.execCommand('copy');
    }
    setCopiado(true);
  }

  async function mostrarAnalise() {
    setErro('');
    const { relatorio, erro } = interpretarRespostaClaude(resposta);
    if (!relatorio) return setErro(erro || 'Resposta inválida.');
    setAGuardar(true);
    try {
      await onRelatorio(relatorio, numFrames);
      setResposta('');
    } catch (err: any) {
      setErro('Erro ao guardar a análise: ' + err.message);
    } finally {
      setAGuardar(false);
    }
  }

  const ocupado = fase !== 'parado';
  const percentagem = progresso.total ? Math.round((progresso.feitos / progresso.total) * 100) : 0;
  const Passo = ({ n, titulo }: { n: number; titulo: string }) => (
    <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
      <span className="w-6 h-6 rounded-full bg-violet-600 text-white flex items-center justify-center text-[11px]">{n}</span>
      {titulo}
    </h3>
  );

  return (
    <section className="bg-gradient-to-br from-violet-50 to-blue-50 p-6 rounded-2xl border border-violet-100 space-y-5">
      <div>
        <h2 className="text-sm font-black text-gray-900 uppercase tracking-wider">🤖 Análise com o Claude (plano Pro)</h2>
        <p className="text-xs text-gray-600 mt-1">
          Sem custos extra: a app prepara as imagens e o pedido, o Claude analisa no claude.ai e a resposta volta para aqui como relatório.
        </p>
        <p className="text-[11px] text-violet-800 mt-2">
          🔒 Requer autorização de análise por IA. No claude.ai, confirme em Definições → Privacidade que a opção de usar as conversas para treinar os modelos está <b>desligada</b>.
        </p>
      </div>

      {erro && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl">{erro}</div>}

      {/* Passo 1 */}
      <div className="space-y-3">
        <Passo n={1} titulo="Preparar as imagens" />
        <button
          onClick={preparar}
          disabled={ocupado || desativado || !videoUrl}
          className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md transition-all"
        >
          {ocupado ? 'A preparar…' : folhas.length ? '↻ Preparar novamente' : '✨ Preparar para o Claude'}
        </button>
        {ocupado && (
          <div className="space-y-1">
            <p className="text-xs font-bold text-violet-800">
              {fase === 'a_extrair' ? `A extrair frames… ${progresso.feitos}/${progresso.total}` : 'A montar as folhas de contacto…'}
            </p>
            <div className="h-2 bg-white rounded-full overflow-hidden">
              <div className="h-full bg-violet-500 transition-all" style={{ width: `${fase === 'a_montar' ? 100 : percentagem}%` }} />
            </div>
          </div>
        )}
        {folhas.length > 0 && !ocupado && (
          <>
            <p className="text-xs text-gray-600">
              {numFrames} frames organizados em {folhas.length} imagens.
            </p>
            <div className="grid grid-cols-4 md:grid-cols-8 gap-1.5">
              {miniaturas.map((u, i) => (
                <img key={u} src={u} alt={`Folha ${i + 1}`} className="w-full rounded-md border border-white shadow-sm" />
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {podePartilhar && (
                <button onClick={partilhar} className="px-4 py-2 bg-slate-900 hover:bg-black text-white font-bold rounded-xl text-xs">
                  📤 Partilhar imagens (app Claude)
                </button>
              )}
              <button onClick={descarregarZip} className="px-4 py-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-900 font-bold rounded-xl text-xs">
                ⬇ Descarregar imagens (.zip)
              </button>
            </div>
          </>
        )}
      </div>

      {/* Passo 2 */}
      {prompt && !ocupado && (
        <div className="space-y-3">
          <Passo n={2} titulo="Enviar ao Claude" />
          <ol className="text-xs text-gray-700 space-y-1 list-decimal list-inside">
            <li>
              Abra uma conversa nova no{' '}
              <a href="https://claude.ai/new" target="_blank" rel="noopener noreferrer" className="font-bold text-violet-700 underline">
                claude.ai
              </a>{' '}
              (ou na app Claude).
            </li>
            <li>Anexe as {folhas.length} imagens (se descarregou o .zip, extraia-o primeiro).</li>
            <li>Copie o pedido abaixo, cole-o na mensagem e envie.</li>
          </ol>
          <div className="flex items-center gap-3">
            <button onClick={copiarPrompt} className="px-4 py-2 bg-slate-900 hover:bg-black text-white font-bold rounded-xl text-xs">
              📋 Copiar pedido
            </button>
            {copiado && <span className="text-xs font-bold text-emerald-600">✓ Copiado</span>}
          </div>
          <textarea
            ref={promptRef}
            readOnly
            value={prompt}
            rows={4}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-[11px] font-mono text-gray-600 bg-white/70"
          />
        </div>
      )}

      {/* Passo 3 */}
      <div className="space-y-3">
        <Passo n={3} titulo="Colar a resposta do Claude" />
        <textarea
          value={resposta}
          onChange={(e) => setResposta(e.target.value)}
          rows={4}
          placeholder="Cole aqui a resposta completa do Claude (o bloco JSON)…"
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs font-mono text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
        <button
          onClick={mostrarAnalise}
          disabled={!resposta.trim() || aGuardar}
          className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md transition-all"
        >
          {aGuardar ? 'A guardar…' : '📊 Mostrar análise'}
        </button>
      </div>
    </section>
  );
}
