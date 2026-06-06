// sw.js - Service Worker para Braun OnLine v3.3
const CACHE_NAME = 'braun-online-v3-2026';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './maskable_icon_x192.png',
  './maskable_icon_x512.png',
  './logo-cup.png',
  './qr-code.png',
  // Fontes externas
  'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Montserrat:wght@300;400;700;900&family=Inter:wght@300;400;600;800&family=JetBrains+Mono:wght@700&display=swap',
  'https://fonts.gstatic.com/s/bebasneue/v9/JTUSjIg69CK48gW7Zoo3lw.woff2',
  'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm45dW9zg7Q.woff2',
  'https://fonts.gstatic.com/s/inter/v18/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa2JL7SQ.woff2',
  'https://fonts.gstatic.com/s/jetbrainsmono/v18/lDdI8s1q5w8W8bZq1p7eP8o5.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/material-symbols/1.0.0/material-symbols-outlined.woff2'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Cacheando ativos...');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) return cachedResponse;

        return fetch(event.request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return networkResponse;
        }).catch(() => {
          // Melhoria: se o usuário tentar acessar a página principal offline, retorna o index.html
          if (event.request.destination === 'document') {
            return caches.match('./index.html');
          }
          return new Response('Você está offline. Conecte-se à internet.', {
            status: 503,
            statusText: 'Serviço indisponível'
          });
        });
      })
  );
});