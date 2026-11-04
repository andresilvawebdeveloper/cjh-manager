// Junta vários frames numa só imagem ("folha de contacto") com o tempo escrito em cada frame,
// para caber no limite de anexos por mensagem do claude.ai.

import type { FrameExtraido } from './extrairFrames';
import { formatarTempo } from './analise';

export const FRAMES_POR_FOLHA = 6; // 3 colunas x 2 linhas
const COLUNAS = 3;
const LARGURA_CELULA = 560;

export async function criarFolhasContacto(frames: FrameExtraido[]): Promise<Blob[]> {
  if (frames.length === 0) return [];
  const primeiro = await createImageBitmap(frames[0].blob);
  const alturaCelula = Math.round((primeiro.height / primeiro.width) * LARGURA_CELULA);
  primeiro.close();

  const folhas: Blob[] = [];
  for (let inicio = 0; inicio < frames.length; inicio += FRAMES_POR_FOLHA) {
    const grupo = frames.slice(inicio, inicio + FRAMES_POR_FOLHA);
    const linhas = Math.ceil(grupo.length / COLUNAS);
    const canvas = document.createElement('canvas');
    canvas.width = COLUNAS * LARGURA_CELULA;
    canvas.height = linhas * alturaCelula;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let j = 0; j < grupo.length; j++) {
      const x = (j % COLUNAS) * LARGURA_CELULA;
      const y = Math.floor(j / COLUNAS) * alturaCelula;
      const img = await createImageBitmap(grupo[j].blob);
      ctx.drawImage(img, x, y, LARGURA_CELULA, alturaCelula);
      img.close();

      const etiqueta = `#${inicio + j + 1}  ${formatarTempo(grupo[j].t)}`;
      ctx.font = 'bold 22px sans-serif';
      const largura = ctx.measureText(etiqueta).width + 16;
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.fillRect(x + 6, y + 6, largura, 32);
      ctx.fillStyle = '#ffeb3b';
      ctx.fillText(etiqueta, x + 14, y + 30);

      // linha separadora entre frames
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, LARGURA_CELULA, alturaCelula);
    }

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    if (!blob) throw new Error('Falha ao criar folha de contacto.');
    folhas.push(blob);
  }
  return folhas;
}
