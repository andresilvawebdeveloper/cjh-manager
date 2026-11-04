// Service worker da CJH Manager.
// - Páginas: tenta sempre a rede primeiro (dados atualizados); sem rede usa a última versão guardada
//   ou a página "Sem ligação".
// - Ficheiros estáticos do Next.js (têm o nome com hash, nunca mudam): guardados em cache.
// - Pedidos ao Supabase e a outros domínios: nunca são guardados.
const VERSAO = 'cjh-v1';
const ESSENCIAIS = ['/offline.html', '/icons/icon-192.png', '/logo-clube.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSAO).then((cache) => cache.addAll(ESSENCIAIS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== VERSAO).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const pedido = event.request;
  if (pedido.method !== 'GET') return;
  const url = new URL(pedido.url);
  if (url.origin !== self.location.origin) return;

  if (pedido.mode === 'navigate') {
    event.respondWith(
      fetch(pedido)
        .then((resposta) => {
          const copia = resposta.clone();
          if (resposta.ok) caches.open(VERSAO).then((cache) => cache.put(pedido, copia));
          return resposta;
        })
        .catch(async () => (await caches.match(pedido)) || caches.match('/offline.html'))
    );
    return;
  }

  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(pedido).then(
        (emCache) =>
          emCache ||
          fetch(pedido).then((resposta) => {
            const copia = resposta.clone();
            if (resposta.ok) caches.open(VERSAO).then((cache) => cache.put(pedido, copia));
            return resposta;
          })
      )
    );
  }
});
