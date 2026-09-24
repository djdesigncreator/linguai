/* Lingu.AI — service worker
   Guarda a casca da app, para abrir depressa e funcionar offline. */
const CACHE = 'linguai-v2';
const ESSENCIAIS = ['./', './index.html', './manifest.json'];

self.addEventListener('install', ev => {
  self.skipWaiting();
  ev.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ESSENCIAIS).catch(() => {}))
  );
});

self.addEventListener('activate', ev => {
  ev.waitUntil(
    caches.keys().then(nomes =>
      Promise.all(nomes.filter(n => n !== CACHE).map(n => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', ev => {
  const pedido = ev.request;

  // Só tratamos de leituras simples
  if (pedido.method !== 'GET') return;

  const url = new URL(pedido.url);

  // Nunca guardar chamadas à API nem a pagamentos — têm de ser sempre frescas
  if (url.pathname.includes('/api/') || url.hostname.includes('mozpayment')) return;

  // O vocabulário é grande e nunca muda: guarda-se e reaproveita-se
  if (url.pathname.endsWith('vocabulario.json')) {
    ev.respondWith(
      caches.match(pedido).then(guardado =>
        guardado || fetch(pedido).then(r => {
          const copia = r.clone();
          caches.open(CACHE).then(c => c.put(pedido, copia));
          return r;
        })
      )
    );
    return;
  }

  // Resto: tenta a rede primeiro, cai no guardado se falhar
  ev.respondWith(
    fetch(pedido).then(r => {
      if (r && r.status === 200 && r.type === 'basic') {
        const copia = r.clone();
        caches.open(CACHE).then(c => c.put(pedido, copia));
      }
      return r;
    }).catch(() => caches.match(pedido))
  );
});
