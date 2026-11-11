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

/** Bip curto. */
export function bip(frequencia = 880, duracaoMs = 180) {
  if (!contexto) return;
  const agora = contexto.currentTime;
  const osc = contexto.createOscillator();
  const ganho = contexto.createGain();
  osc.type = 'square';
  osc.frequency.value = frequencia;
  ganho.gain.setValueAtTime(0.0001, agora);
  ganho.gain.exponentialRampToValueAtTime(0.35, agora + 0.01);
  ganho.gain.exponentialRampToValueAtTime(0.0001, agora + duracaoMs / 1000);
  osc.connect(ganho).connect(contexto.destination);
  osc.start(agora);
  osc.stop(agora + duracaoMs / 1000 + 0.02);
}
