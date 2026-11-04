// Extrai frames de um vídeo no browser (canvas), para enviar à análise por IA.

import { INTERVALO_MIN_SEGUNDOS, LADO_MAIOR_PX, MAX_FRAMES } from './analiseIA';

export interface FrameExtraido {
  t: number;
  blob: Blob;
}

function esperarEvento(el: HTMLMediaElement, evento: string, timeoutMs = 20000) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      limpar();
      reject(new Error(`O vídeo não respondeu (${evento}).`));
    }, timeoutMs);
    const ok = () => {
      limpar();
      resolve();
    };
    const erro = () => {
      limpar();
      reject(new Error('Não foi possível ler o vídeo neste browser.'));
    };
    const limpar = () => {
      clearTimeout(timer);
      el.removeEventListener(evento, ok);
      el.removeEventListener('error', erro);
    };
    el.addEventListener(evento, ok, { once: true });
    el.addEventListener('error', erro, { once: true });
  });
}

export interface OpcoesExtracao {
  maxFrames?: number;
  intervaloMin?: number;
  ladoMaior?: number;
}

export async function extrairFrames(
  videoUrl: string,
  onProgresso: (feitos: number, total: number) => void,
  { maxFrames = MAX_FRAMES, intervaloMin = INTERVALO_MIN_SEGUNDOS, ladoMaior = LADO_MAIOR_PX }: OpcoesExtracao = {}
): Promise<FrameExtraido[]> {
  const video = document.createElement('video');
  video.crossOrigin = 'anonymous';
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.src = videoUrl;
  video.load();

  try {
    await esperarEvento(video, 'loadeddata');

    const duracao = video.duration;
    if (!isFinite(duracao) || duracao <= 0) throw new Error('Não foi possível determinar a duração do vídeo.');

    const total = Math.max(1, Math.min(maxFrames, Math.floor(duracao / intervaloMin)));
    const passo = duracao / total;

    const escala = Math.min(1, ladoMaior / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(video.videoWidth * escala);
    canvas.height = Math.round(video.videoHeight * escala);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas indisponível.');

    const frames: FrameExtraido[] = [];
    for (let i = 0; i < total; i++) {
      const t = Math.min(duracao - 0.05, i * passo + passo / 2);
      const procura = esperarEvento(video, 'seeked');
      video.currentTime = t;
      await procura;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.8));
      if (!blob) throw new Error('Falha ao capturar frame.');
      frames.push({ t, blob });
      onProgresso(i + 1, total);
    }
    return frames;
  } catch (err: any) {
    if (err?.name === 'SecurityError') {
      throw new Error('O browser bloqueou a leitura do vídeo (CORS). Verifique a configuração do Storage.');
    }
    throw err;
  } finally {
    video.removeAttribute('src');
    video.load();
  }
}
