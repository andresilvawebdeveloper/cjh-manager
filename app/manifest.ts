import type { MetadataRoute } from 'next';

// Manifesto da app instalável (PWA). O Next.js publica-o em /manifest.webmanifest.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CJH Manager',
    short_name: 'CJH',
    description: 'Gestão do Clube de Judo Hajime',
    lang: 'pt-PT',
    start_url: '/?origem=app',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#1F4E78',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Cronómetro', url: '/dashboard/cronometro', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Centros e Turmas', url: '/dashboard/centros', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Análise de Competições', url: '/dashboard/analise', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
    ],
  };
}
