// Nome do cache - Versão atualizada para forçar atualização
const CACHE_NAME = 'braun-v2.6';

// Lista de arquivos essenciais
const assets = [
  './',
  './index.html',
  './manifest.json',
  './maskable_icon_x192.png',
  './maskable_icon_x512.png',
  './screenshot-mobile.png',
  './screenshot-desktop.png'
];

// 1. Instalação
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('PWA: Cacheando arquivos essenciais...');
      return cache.addAll(assets);
    })
  );
  self.skipWaiting(); // Força a ativação imediata
});

// 2. Ativação
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('PWA: Removendo cache obsoleto:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      // Toma o controle de todas as páginas abertas
      return self.clients.claim();
    })
  );
});

// 3. Interceptação (Fetch) com Stale-While-Revalidate melhorado
self.addEventListener('fetch', (event) => {
  if (!(event.request.url.indexOf('http') === 0)) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        return cachedResponse;
      });

      return cachedResponse || fetchPromise;
    })
  );
});
