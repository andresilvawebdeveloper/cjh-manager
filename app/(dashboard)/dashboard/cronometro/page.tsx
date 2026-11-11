'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  OPCOES_FIM,
  OPCOES_INICIO,
  VozFim,
  VozInicio,
  bip,
  desbloquearAudio,
  falar,
  pararVoz,
} from '../../../../lib/sonsCronometro';
import HajimeMusic from './HajimeMusic';
import CampoNumero from './CampoNumero';

type Fase = 'parado' | 'preparar' | 'combate' | 'descanso' | 'terminado';

const CONTAGEM_MS = 3000; // 3 bips (1 por segundo) antes de cada "Start"

interface Config {
  minutos: number;
  segundos: number;
  rondas: number;
  descanso: number; // segundos entre rondas
  vozInicio: VozInicio;
  vozFim: VozFim;
}

const CONFIG_INICIAL: Config = { minutos: 4, segundos: 0, rondas: 1, descanso: 30, vozInicio: 'start', vozFim: 'end' };
const PREDEFINIDOS = [1, 2, 3, 4, 5];
const CHAVE_CONFIG = 'cronometro-config';

const formatar = (ms: number) => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

export default function CronometroPage() {
  const [config, setConfig] = useState<Config>(CONFIG_INICIAL);
  const [fase, setFase] = useState<Fase>('parado');
  const [pausado, setPausado] = useState(false);
  const [ronda, setRonda] = useState(1);
  const [restanteMs, setRestanteMs] = useState(CONFIG_INICIAL.minutos * 60000);

  // Estado "vivo" do cronómetro (refs para o ciclo de tempo não ler valores antigos)
  const ref = useRef({
    fase: 'parado' as Fase,
    ronda: 1,
    fimEm: 0, // instante (ms) em que a fase atual termina
    duracaoFase: 0,
    restantePausa: 0,
    pausado: false,
    avisos: new Set<string>(), // avisos já dados nesta fase ('30', '3', '2', '1')
    config: CONFIG_INICIAL,
  });
  const wakeLock = useRef<any>(null);
  const areaRef = useRef<HTMLDivElement>(null);

  const duracaoCombateMs = (c: Config) => (c.minutos * 60 + c.segundos) * 1000;

  // Carregar a última configuração usada neste dispositivo
  useEffect(() => {
    try {
      const guardada = localStorage.getItem(CHAVE_CONFIG);
      if (guardada) {
        const c = { ...CONFIG_INICIAL, ...JSON.parse(guardada) };
        setConfig(c);
        setRestanteMs(duracaoCombateMs(c));
      }
    } catch {
      // usa a configuração inicial
    }
  }, []);

  function mudarConfig(campos: Partial<Config>) {
    const nova = { ...config, ...campos };
    setConfig(nova);
    setRestanteMs(duracaoCombateMs(nova));
    try {
      localStorage.setItem(CHAVE_CONFIG, JSON.stringify(nova));
    } catch {
      // sem armazenamento: a configuração só dura esta visita
    }
  }

  async function manterEcraLigado(ligar: boolean) {
    try {
      if (ligar && 'wakeLock' in navigator && !wakeLock.current) {
        wakeLock.current = await (navigator as any).wakeLock.request('screen');
      } else if (!ligar && wakeLock.current) {
        await wakeLock.current.release();
        wakeLock.current = null;
      }
    } catch {
      // nem todos os browsers deixam manter o ecrã ligado
    }
  }

  const iniciarFase = useCallback((novaFase: 'preparar' | 'combate' | 'descanso', duracaoMs: number) => {
    const r = ref.current;
    r.fase = novaFase;
    r.duracaoFase = duracaoMs;
    r.fimEm = performance.now() + duracaoMs;
    r.avisos = new Set();
    setFase(novaFase);
    setRestanteMs(duracaoMs);
    if (novaFase === 'combate') falar(r.config.vozInicio);
  }, []);

  const terminarTudo = useCallback(() => {
    const r = ref.current;
    r.fase = 'terminado';
    setFase('terminado');
    setRestanteMs(0);
    manterEcraLigado(false);
  }, []);

  // Ciclo do tempo: calcula o tempo a partir do relógio (não acumula erros) e dispara os sons
  useEffect(() => {
    const id = setInterval(() => {
      const r = ref.current;
      if ((r.fase !== 'combate' && r.fase !== 'descanso' && r.fase !== 'preparar') || r.pausado) return;

      const restante = r.fimEm - performance.now();

      // "30 seconds left" só em combates com mais de 1 minuto
      if (r.fase === 'combate' && r.duracaoFase > 60000 && restante <= 30000 && restante > 3000 && !r.avisos.has('30')) {
        r.avisos.add('30');
        falar('trinta');
      }

      // Bip em cada um dos últimos 3 segundos (contagem antes do Start, fim do combate e fim do descanso)
      for (const s of [3, 2, 1]) {
        if (restante <= s * 1000 && !r.avisos.has(String(s))) {
          r.avisos.add(String(s));
          if (restante > (s - 1) * 1000) bip(); // não dar bips atrasados se o ecrã esteve bloqueado
        }
      }

      if (restante > 0) {
        setRestanteMs(restante);
        return;
      }

      // Fim da fase
      if (r.fase === 'preparar') {
        iniciarFase('combate', duracaoCombateMs(r.config));
      } else if (r.fase === 'combate') {
        falar(r.config.vozFim);
        if (r.ronda < r.config.rondas) {
          if (r.config.descanso > 0) {
            iniciarFase('descanso', r.config.descanso * 1000);
          } else {
            r.ronda += 1;
            setRonda(r.ronda);
            iniciarFase('preparar', CONTAGEM_MS);
          }
        } else {
          terminarTudo();
        }
      } else {
        r.ronda += 1;
        setRonda(r.ronda);
        iniciarFase('combate', duracaoCombateMs(r.config));
      }
    }, 100);
    return () => clearInterval(id);
  }, [iniciarFase, terminarTudo]);

  // Se o ecrã voltar a ficar visível, voltar a pedir para o manter ligado
  useEffect(() => {
    const aoVoltar = () => {
      const r = ref.current;
      if (document.visibilityState === 'visible' && (r.fase === 'combate' || r.fase === 'descanso' || r.fase === 'preparar')) {
        wakeLock.current = null;
        manterEcraLigado(true);
      }
    };
    document.addEventListener('visibilitychange', aoVoltar);
    return () => document.removeEventListener('visibilitychange', aoVoltar);
  }, []);

  function iniciar() {
    if (duracaoCombateMs(config) <= 0) return;
    desbloquearAudio(); // tem de acontecer dentro do toque no botão
    const r = ref.current;
    r.config = config;
    r.ronda = 1;
    r.pausado = false;
    setRonda(1);
    setPausado(false);
    manterEcraLigado(true);
    iniciarFase('preparar', CONTAGEM_MS);
  }

  function pausarOuRetomar() {
    const r = ref.current;
    if (!r.pausado) {
      r.pausado = true;
      r.restantePausa = Math.max(0, r.fimEm - performance.now());
      setPausado(true);
      pararVoz();
    } else {
      desbloquearAudio();
      r.pausado = false;
      r.fimEm = performance.now() + r.restantePausa;
      setPausado(false);
    }
  }

  function repor() {
    const r = ref.current;
    r.fase = 'parado';
    r.pausado = false;
    r.ronda = 1;
    setFase('parado');
    setPausado(false);
    setRonda(1);
    setRestanteMs(duracaoCombateMs(config));
    pararVoz();
    manterEcraLigado(false);
  }

  function saltarDescanso() {
    const r = ref.current;
    if (r.fase !== 'descanso') return;
    desbloquearAudio();
    r.pausado = false;
    setPausado(false);
    r.ronda += 1;
    setRonda(r.ronda);
    iniciarFase('preparar', CONTAGEM_MS);
  }

  function testarSons() {
    desbloquearAudio();
    bip();
    setTimeout(() => bip(), 1000);
    setTimeout(() => bip(), 2000);
    setTimeout(() => falar(config.vozInicio), 3000);
    setTimeout(() => falar(config.vozFim), 4500);
  }

  function ecraInteiro() {
    const el = areaRef.current as any;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen?.();
    else (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el);
  }

  const aCorrer = fase === 'combate' || fase === 'descanso' || fase === 'preparar';
  const ultimosSegundos = fase === 'combate' && restanteMs <= 10000;
  const corPainel =
    fase === 'preparar'
      ? pausado
        ? 'bg-amber-500'
        : 'bg-slate-700'
      : fase === 'combate'
      ? pausado
        ? 'bg-amber-500'
        : 'bg-emerald-600'
      : fase === 'descanso'
        ? 'bg-blue-600'
        : fase === 'terminado'
          ? 'bg-red-600'
          : 'bg-slate-800';
  const textoFase =
    fase === 'preparar'
      ? pausado
        ? 'Pausa'
        : 'Prontos…'
      : fase === 'combate'
      ? pausado
        ? 'Pausa'
        : 'Combate'
      : fase === 'descanso'
        ? 'Descanso — troquem de par'
        : fase === 'terminado'
          ? 'Terminado'
          : 'Pronto';
  const progresso = aCorrer && ref.current.duracaoFase ? 1 - restanteMs / ref.current.duracaoFase : fase === 'terminado' ? 1 : 0;

  const campo = 'w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50';

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <Link href="/dashboard" className="text-xs font-bold text-gray-500 hover:text-blue-600 block mb-2">← Voltar ao Dashboard</Link>
        <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Tatami</span>
        <h1 className="text-2xl font-black text-gray-900 mt-1">Cronómetro de Randori e Combate</h1>
      </div>

      {/* Mostrador */}
      <div
        ref={areaRef}
        className={`${corPainel} rounded-3xl shadow-lg text-white p-6 sm:p-10 flex flex-col items-center justify-center gap-4 transition-colors`}
      >
        <div className="flex items-center gap-3 text-sm font-bold uppercase tracking-widest opacity-90">
          <span>{textoFase}</span>
          {config.rondas > 1 && fase !== 'parado' && (
            <span className="bg-black/20 rounded-full px-3 py-1">
              Ronda {Math.min(ronda, config.rondas)} / {config.rondas}
            </span>
          )}
        </div>
        <div
          className={`font-black tabular-nums leading-none text-[22vw] sm:text-[9rem] ${ultimosSegundos && !pausado ? 'animate-pulse' : ''}`}
          aria-live="off"
        >
          {fase === 'preparar' ? Math.max(1, Math.ceil(restanteMs / 1000)) : formatar(restanteMs)}
        </div>
        <div className="w-full max-w-md h-2 bg-black/20 rounded-full overflow-hidden">
          <div className="h-full bg-white/80 transition-all" style={{ width: `${Math.min(100, progresso * 100)}%` }} />
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {!aCorrer ? (
            <button
              onClick={iniciar}
              disabled={duracaoCombateMs(config) <= 0}
              className="px-8 py-4 bg-white text-gray-900 font-black rounded-2xl text-lg shadow-md hover:scale-105 transition-transform disabled:opacity-50"
            >
              ▶ {fase === 'terminado' ? 'Recomeçar' : 'Iniciar'}
            </button>
          ) : (
            <button
              onClick={pausarOuRetomar}
              className="px-8 py-4 bg-white text-gray-900 font-black rounded-2xl text-lg shadow-md hover:scale-105 transition-transform"
            >
              {pausado ? '▶ Retomar' : '⏸ Pausar'}
            </button>
          )}
          {fase === 'descanso' && (
            <button onClick={saltarDescanso} className="px-5 py-4 bg-black/20 hover:bg-black/30 font-bold rounded-2xl text-sm">
              ⏭ Saltar descanso
            </button>
          )}
          {fase !== 'parado' && (
            <button onClick={repor} className="px-5 py-4 bg-black/20 hover:bg-black/30 font-bold rounded-2xl text-sm">
              ↺ Repor
            </button>
          )}
          <button onClick={ecraInteiro} className="px-5 py-4 bg-black/20 hover:bg-black/30 font-bold rounded-2xl text-sm" title="Ecrã inteiro">
            ⛶
          </button>
        </div>
      </div>

      <HajimeMusic emCombate={fase === 'combate' && !pausado} cronometroAtivo={fase !== 'parado'} />

      {/* Configuração */}
      <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Configuração</h2>
          {aCorrer && <span className="text-[11px] text-gray-500">Pare o cronómetro para alterar.</span>}
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-bold text-gray-600">Duração do combate</label>
          <div className="flex flex-wrap gap-2">
            {PREDEFINIDOS.map((m) => (
              <button
                key={m}
                disabled={aCorrer}
                onClick={() => mudarConfig({ minutos: m, segundos: 0 })}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all disabled:opacity-50 ${
                  config.minutos === m && config.segundos === 0 ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {m} min
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 max-w-xs">
            <div>
              <span className="text-[10px] font-bold text-gray-500 uppercase">Minutos</span>
              <CampoNumero valor={config.minutos} min={0} max={59} passo={1} disabled={aCorrer} onChange={(n) => mudarConfig({ minutos: n })} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-500 uppercase">Segundos</span>
              <CampoNumero valor={config.segundos} min={0} max={59} passo={5} disabled={aCorrer} onChange={(n) => mudarConfig({ segundos: n })} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 max-w-md">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Rondas</label>
            <CampoNumero valor={config.rondas} min={1} max={50} passo={1} disabled={aCorrer} onChange={(n) => mudarConfig({ rondas: n })} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Descanso entre rondas (seg.)</label>
            <CampoNumero valor={config.descanso} min={0} max={600} passo={5} disabled={aCorrer || config.rondas <= 1} onChange={(n) => mudarConfig({ descanso: n })} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Som no início</label>
            <div className="flex gap-2">
              {OPCOES_INICIO.map((o) => (
                <button
                  key={o.valor}
                  disabled={aCorrer}
                  onClick={() => mudarConfig({ vozInicio: o.valor })}
                  className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all disabled:opacity-50 ${
                    config.vozInicio === o.valor ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  🔊 {o.rotulo}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Som no fim</label>
            <div className="flex gap-2">
              {OPCOES_FIM.map((o) => (
                <button
                  key={o.valor}
                  disabled={aCorrer}
                  onClick={() => mudarConfig({ vozFim: o.valor })}
                  className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all disabled:opacity-50 ${
                    config.vozFim === o.valor ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  🔊 {o.rotulo}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            onClick={testarSons}
            className="px-4 py-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-900 font-bold rounded-xl text-xs"
          >
            🔈 Testar sons
          </button>
          <p className="text-[11px] text-gray-500">
            Avisos automáticos: 3 bips (um por segundo) antes de cada início e antes de cada fim, e "30 seconds left" em combates com mais de 1 minuto.
          </p>
        </div>
      </section>
    </div>
  );
}
