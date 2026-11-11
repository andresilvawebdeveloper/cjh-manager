// Manter o ecrã do telemóvel ligado enquanto o cronómetro corre.
// 1) Screen Wake Lock API (Android/Chrome e iPhone recente).
// 2) Alternativa: um vídeo minúsculo, sem som, em ciclo — impede o bloqueio do ecrã onde o
//    Wake Lock não existe ou não funciona (ex: iPhone com a app instalada em iOS anterior a 18.4).

export type ModoEcra = 'wakelock' | 'video' | 'wakelock+video' | null;

let bloqueio: any = null;
let video: HTMLVideoElement | null = null;

const eIOS = () =>
  typeof navigator !== 'undefined' &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

function iniciarVideo(): boolean {
  try {
    if (!video) {
      video = document.createElement('video');
      video.src = '/ecra-ligado.mp4';
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.setAttribute('playsinline', '');
      video.setAttribute('muted', '');
      video.setAttribute('aria-hidden', 'true');
      // Tem de estar "visível" para contar, mas sem se notar
      Object.assign(video.style, { position: 'fixed', width: '1px', height: '1px', opacity: '0.01', pointerEvents: 'none', bottom: '0', left: '0' });
      document.body.appendChild(video);
    }
    const p = video.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
    return true;
  } catch {
    return false;
  }
}

/** Liga a proteção. Chamar dentro de um toque do utilizador (ex: botão Iniciar). */
export async function ligarEcra(): Promise<ModoEcra> {
  // No iPhone o vídeo começa já (o toque do utilizador ainda é válido), mesmo que o Wake Lock exista
  const comVideo = eIOS() || !('wakeLock' in navigator);
  if (comVideo) iniciarVideo();

  if ('wakeLock' in navigator && !bloqueio) {
    try {
      bloqueio = await (navigator as any).wakeLock.request('screen');
      bloqueio.addEventListener?.('release', () => {
        bloqueio = null;
      });
    } catch {
      bloqueio = null;
      if (!comVideo && iniciarVideo()) return 'video';
    }
  }
  if (bloqueio && comVideo) return 'wakelock+video';
  if (bloqueio) return 'wakelock';
  return video ? 'video' : null;
}

/** Desliga a proteção (o ecrã volta a apagar-se normalmente). */
export async function desligarEcra() {
  try {
    await bloqueio?.release();
  } catch {
    // já tinha sido libertado
  }
  bloqueio = null;
  if (video) {
    video.pause();
    video.remove();
    video = null;
  }
}
