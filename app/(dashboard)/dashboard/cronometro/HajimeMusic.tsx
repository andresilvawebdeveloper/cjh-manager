'use client';

import { useEffect, useRef, useState } from 'react';

// Leitor do Spotify (Embed + iFrame API oficial) para tocar uma playlist enquanto o cronómetro corre.
// https://developer.spotify.com/documentation/embeds/references/iframe-api

const SCRIPT_API = 'https://open.spotify.com/embed/iframe-api/v1';
const CHAVE_LINK = 'hajime-music-link';
const CHAVE_PAUSAR = 'hajime-music-pausar';
// Playlist do clube, usada quando o dispositivo ainda não escolheu outra
export const PLAYLIST_HAJIME = 'https://open.spotify.com/playlist/5OFyUo5eaZeRNIzZmG0aLI';

let promessaApi: Promise<any> | null = null;

function carregarApi(): Promise<any> {
  if (promessaApi) return promessaApi;
  promessaApi = new Promise((resolve) => {
    (window as any).onSpotifyIframeApiReady = (api: any) => resolve(api);
    const s = document.createElement('script');
    s.src = SCRIPT_API;
    s.async = true;
    document.body.appendChild(s);
  });
  return promessaApi;
}

/** Aceita links do Spotify (playlist, álbum, música, podcast) ou URIs spotify:tipo:id. Devolve o link normalizado. */
export function normalizarLinkSpotify(texto: string): string | null {
  let t = texto.trim();
  // Aceitar também o código de incorporação (<iframe src="https://open.spotify.com/embed/...">)
  const src = /src=["']([^"']+)["']/.exec(t);
  if (src) t = src[1];
  const uri = /^spotify:(playlist|album|track|artist|show|episode):([A-Za-z0-9]+)$/.exec(t);
  if (uri) return `https://open.spotify.com/${uri[1]}/${uri[2]}`;
  try {
    const u = new URL(t);
    if (u.hostname !== 'open.spotify.com') return null;
    const m = /\/(playlist|album|track|artist|show|episode)\/([A-Za-z0-9]+)/.exec(u.pathname);
    return m ? `https://open.spotify.com/${m[1]}/${m[2]}` : null;
  } catch {
    return null;
  }
}

interface Props {
  /** true enquanto o combate está a decorrer (não em pausa, descanso ou contagem) */
  emCombate: boolean;
  /** true depois de o cronómetro ter sido iniciado (para não mexer na música antes disso) */
  cronometroAtivo: boolean;
}

export default function HajimeMusic({ emCombate, cronometroAtivo }: Props) {
  const [link, setLink] = useState<string | null>(null);
  const [texto, setTexto] = useState('');
  const [aEditar, setAEditar] = useState(false);
  const [erro, setErro] = useState('');
  const [pausarForaDoCombate, setPausarForaDoCombate] = useState(false);
  const [aTocar, setATocar] = useState(false);
  // O leitor incorporado só toca amostras de 30 s nos telemóveis: fica como pré-visualização opcional
  const [preVisualizar, setPreVisualizar] = useState(false);

  const alvoRef = useRef<HTMLDivElement>(null);
  const controlador = useRef<any>(null);
  const tocar = useRef(false);
  const pausadaPorMim = useRef(false);

  useEffect(() => {
    try {
      setLink(localStorage.getItem(CHAVE_LINK) || PLAYLIST_HAJIME);
      setPausarForaDoCombate(localStorage.getItem(CHAVE_PAUSAR) === '1');
    } catch {
      setLink(PLAYLIST_HAJIME);
    }
  }, []);

  // Criar (ou trocar) o leitor quando há link
  useEffect(() => {
    if (!preVisualizar) {
      controlador.current?.destroy?.();
      controlador.current = null;
      setATocar(false);
      return;
    }
    if (!link || !alvoRef.current) return;
    let cancelado = false;
    carregarApi().then((api) => {
      if (cancelado) return;
      if (controlador.current) {
        const c = controlador.current;
        if (c.loadEntity) c.loadEntity(link);
        else c.loadUri?.(link.replace('https://open.spotify.com/', 'spotify:').replace('/', ':'));
        return;
      }
      const el = document.createElement('div');
      alvoRef.current!.innerHTML = '';
      alvoRef.current!.appendChild(el);
      api.createController(el, { url: link, width: '100%', height: 352 }, (c: any) => {
        controlador.current = c;
        c.addListener('playback_update', (e: any) => {
          const pausado = !!e?.data?.isPaused;
          tocar.current = !pausado;
          setATocar(!pausado);
        });
      });
    });
    return () => {
      cancelado = true;
    };
  }, [link, preVisualizar]);

  // Pausar no descanso/fim e retomar no Start (opcional)
  const anterior = useRef(emCombate);
  useEffect(() => {
    const c = controlador.current;
    if (!c || !pausarForaDoCombate || !cronometroAtivo) {
      anterior.current = emCombate;
      return;
    }
    if (anterior.current && !emCombate && tocar.current) {
      c.pause();
      pausadaPorMim.current = true;
    } else if (!anterior.current && emCombate && pausadaPorMim.current) {
      c.resume();
      pausadaPorMim.current = false;
    }
    anterior.current = emCombate;
  }, [emCombate, cronometroAtivo, pausarForaDoCombate]);

  function guardarLink() {
    const n = normalizarLinkSpotify(texto);
    if (!n) {
      setErro('Link inválido. No Spotify: playlist → ⋯ → Partilhar → Copiar link da playlist, e cole aqui.');
      return;
    }
    setErro('');
    setLink(n);
    setAEditar(false);
    try {
      localStorage.setItem(CHAVE_LINK, n);
    } catch {
      // sem armazenamento: o link só dura esta visita
    }
  }

  /** Abre a playlist na app do Spotify (músicas completas). Se a app não abrir, abre o link normal. */
  function abrirNoSpotify() {
    if (!link) return;
    const uri = link.replace('https://open.spotify.com/', 'spotify:').replace('/', ':');
    let saiu = false;
    const aoSair = () => {
      if (document.visibilityState === 'hidden') saiu = true;
    };
    document.addEventListener('visibilitychange', aoSair);
    window.location.href = uri;
    setTimeout(() => {
      document.removeEventListener('visibilitychange', aoSair);
      if (!saiu) window.open(link, '_blank', 'noopener');
    }, 1500);
  }

  function mudarPausar(v: boolean) {
    setPausarForaDoCombate(v);
    try {
      localStorage.setItem(CHAVE_PAUSAR, v ? '1' : '0');
    } catch {
      // sem armazenamento
    }
  }

  return (
    <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-black text-gray-900 uppercase tracking-wider">
          🎵 Hajime Music {aTocar && <span className="ml-1 text-[10px] font-bold text-emerald-600 normal-case">● a tocar</span>}
        </h2>
        {link && !aEditar && (
          <button
            onClick={() => {
              setTexto(link);
              setAEditar(true);
            }}
            className="text-xs font-bold text-blue-600 hover:underline"
          >
            Mudar playlist
          </button>
        )}
      </div>

      {aEditar && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500">
            Cole o link de uma playlist do Spotify (no Spotify: playlist → ⋯ → Partilhar → Copiar link). Fica guardado neste dispositivo.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="url"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="https://open.spotify.com/playlist/…"
              className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button onClick={guardarLink} className="px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-xs">
              Usar esta playlist
            </button>
            {link && (
              <button onClick={() => setAEditar(false)} className="px-3 py-2.5 text-xs font-bold text-gray-500 hover:text-gray-800">
                Cancelar
              </button>
            )}
            {link !== PLAYLIST_HAJIME && (
              <button
                onClick={() => {
                  setLink(PLAYLIST_HAJIME);
                  setAEditar(false);
                  try {
                    localStorage.removeItem(CHAVE_LINK);
                  } catch {
                    // sem armazenamento
                  }
                }}
                className="px-3 py-2.5 text-xs font-bold text-green-700 hover:underline"
              >
                Voltar à playlist do clube
              </button>
            )}
          </div>
          {erro && <p className="text-xs font-bold text-red-600">{erro}</p>}
        </div>
      )}

      {link && !aEditar && (
        <>
          <button
            onClick={abrirNoSpotify}
            className="w-full flex items-center justify-center gap-3 px-5 py-4 bg-[#1DB954] hover:bg-[#1aa34a] text-white font-black rounded-2xl text-base shadow-md transition-all"
          >
            <span className="text-2xl leading-none">▶</span>
            {link === PLAYLIST_HAJIME ? 'Abrir Hajime Music no Spotify' : 'Abrir a playlist no Spotify'}
          </button>
          <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
            <li>Toque no botão: a playlist abre na app do Spotify, com as músicas completas.</li>
            <li>Carregue em ▶ no Spotify e volte à CJH Manager.</li>
            <li>Deixe o cronómetro aberto no ecrã: a música continua a tocar e os bips e a voz ouvem-se por cima.</li>
          </ol>
        </>
      )}

      {/* Pré-visualização dentro da app (o Spotify só deixa tocar amostras de 30 s aqui) */}
      {link && (
        <div className="border-t border-gray-100 pt-3 space-y-3">
          <button onClick={() => setPreVisualizar((v) => !v)} className="text-xs font-bold text-gray-500 hover:text-gray-800">
            {preVisualizar ? '▾ Esconder pré-visualização' : '▸ Ver a playlist aqui (amostras de 30 segundos)'}
          </button>
          <div ref={alvoRef} className={preVisualizar ? 'rounded-xl overflow-hidden min-h-[152px]' : 'hidden'} />
          {preVisualizar && (
            <label className="flex items-start gap-2 text-xs text-gray-700 cursor-pointer">
              <input type="checkbox" checked={pausarForaDoCombate} onChange={(e) => mudarPausar(e.target.checked)} className="mt-0.5 w-4 h-4" />
              <span>
                <b>Pausar este leitor no descanso e no fim</b>, e retomar no "Start" seguinte (não controla a app do Spotify).
              </span>
            </label>
          )}
        </div>
      )}
    </section>
  );
}
