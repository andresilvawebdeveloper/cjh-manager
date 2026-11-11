// Sons do cronómetro: voz (Web Speech API) e bips (Web Audio API).
// Tudo funciona no próprio dispositivo, sem internet.

export type VozInicio = 'start' | 'hajime' | 'comeca';
export type VozFim = 'end' | 'mate' | 'terminou';

export const OPCOES_INICIO: { valor: VozInicio; rotulo: string }[] = [
  { valor: 'start', rotulo: 'Start' },
  { valor: 'hajime', rotulo: 'Hajime' },
  { valor: 'comeca', rotulo: 'Começa' },
];

export const OPCOES_FIM: { valor: VozFim; rotulo: string }[] = [
  { valor: 'end', rotulo: 'End' },
  { valor: 'mate', rotulo: 'Maté' },
  { valor: 'terminou', rotulo: 'Terminou' },
];

interface Frase {
  // Texto e língua preferidos; se não houver voz nessa língua usa-se a alternativa.
  texto: string;
  lingua: string;
  alternativa?: { texto: string; lingua: string };
}

const FRASES: Record<VozInicio | VozFim | 'trinta', Frase> = {
  // Em japonês a pronúncia fica correta; sem voz japonesa, o inglês aproxima-se melhor que o português
  hajime: { texto: 'はじめ', lingua: 'ja', alternativa: { texto: 'Hajime', lingua: 'en' } },
  mate: { texto: 'まて', lingua: 'ja', alternativa: { texto: 'Matte', lingua: 'en' } },
  start: { texto: 'Start!', lingua: 'en' },
  end: { texto: 'End!', lingua: 'en' },
  comeca: { texto: 'Começa', lingua: 'pt' },
  terminou: { texto: 'Terminou', lingua: 'pt' },
  trinta: { texto: '30 seconds left', lingua: 'en' },
};

function vozPara(lingua: string): SpeechSynthesisVoice | undefined {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return undefined;
  const vozes = window.speechSynthesis.getVoices();
  // Preferir português de Portugal quando se pede português
  if (lingua === 'pt') {
    return vozes.find((v) => v.lang.toLowerCase().startsWith('pt-pt')) || vozes.find((v) => v.lang.toLowerCase().startsWith('pt'));
  }
  return vozes.find((v) => v.lang.toLowerCase().startsWith(lingua));
}

/** Diz uma das frases do cronómetro em voz alta. */
export function falar(chave: keyof typeof FRASES) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const frase = FRASES[chave];
  let texto = frase.texto;
  let voz = vozPara(frase.lingua);
  let lingua = frase.lingua;
  if (!voz && frase.alternativa) {
    texto = frase.alternativa.texto;
    lingua = frase.alternativa.lingua;
    voz = vozPara(lingua);
  }
  const u = new SpeechSynthesisUtterance(texto);
  if (voz) u.voice = voz;
  u.lang = voz?.lang || lingua;
  u.rate = 1;
  u.volume = 1;
  window.speechSynthesis.speak(u);
}

export function pararVoz() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
}

let contexto: AudioContext | null = null;

/**
 * Prepara o áudio. Tem de ser chamado dentro de um toque/clique do utilizador
 * (os telemóveis, sobretudo iPhone, bloqueiam som que não comece assim).
 */
export function desbloquearAudio() {
  if (typeof window === 'undefined') return;
  // Safari (iPhone): sons "ambiente" misturam-se com o Spotify em vez de o pausar
  try {
    const sessao = (navigator as any).audioSession;
    if (sessao && sessao.type !== 'ambient') sessao.type = 'ambient';
  } catch {
    // browsers sem Audio Session API: comportamento normal
  }
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!contexto && Ctx) contexto = new Ctx();
    if (contexto?.state === 'suspended') contexto.resume();
  } catch {
    // sem Web Audio: os bips ficam desligados, a voz continua a funcionar
  }
  // Carregar a lista de vozes (em alguns browsers só fica disponível depois disto)
  if ('speechSynthesis' in window) window.speechSynthesis.getVoices();
}

export type VolumeBips = 'normal' | 'alto' | 'maximo';

export const OPCOES_VOLUME: { valor: VolumeBips; rotulo: string }[] = [
  { valor: 'normal', rotulo: 'Normal' },
  { valor: 'alto', rotulo: 'Alto' },
  { valor: 'maximo', rotulo: 'Máximo' },
];

// Mais volume, nota mais aguda (destaca-se da música) e um pouco mais longo.
// O "Máximo" usa o volume digital máximo sem o ultrapassar (passar o limite só distorce, não aumenta o som)
// e uma nota perto dos 2 kHz, zona em que o ouvido é mais sensível.
const NIVEIS: Record<VolumeBips, { ganho: number; freq: number; dur: number }> = {
  normal: { ganho: 0.35, freq: 880, dur: 180 },
  alto: { ganho: 0.8, freq: 1100, dur: 230 },
  maximo: { ganho: 0.97, freq: 1760, dur: 280 },
};

let volumeAtual: VolumeBips = 'alto';

export function definirVolumeBips(v: VolumeBips) {
  volumeAtual = v;
}

/** Agenda um bip num contexto de áudio (usado pelo cronómetro e nos testes). */
export function agendarBip(ctx: BaseAudioContext, quando: number, volume: VolumeBips) {
  const n = NIVEIS[volume];
  const fim = quando + n.dur / 1000;
  const ganho = ctx.createGain();
  ganho.gain.setValueAtTime(0.0001, quando);
  ganho.gain.exponentialRampToValueAtTime(n.ganho, quando + 0.008);
  ganho.gain.setValueAtTime(n.ganho, fim - 0.04);
  ganho.gain.exponentialRampToValueAtTime(0.0001, fim);
  ganho.connect(ctx.destination);
  const osc = ctx.createOscillator();
  osc.type = 'square';
  osc.frequency.value = n.freq;
  osc.connect(ganho);
  osc.start(quando);
  osc.stop(fim + 0.02);
}

/** Bip curto, com o volume escolhido na configuração. */
export function bip(volume: VolumeBips = volumeAtual) {
  if (!contexto) return;
  agendarBip(contexto, contexto.currentTime, volume);
}
