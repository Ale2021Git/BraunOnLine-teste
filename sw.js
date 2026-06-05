// sw.js - Service Worker para Braun OnLine v3.3
const CACHE_NAME = 'braun-online-v3-2026';

// Removidos os links diretos do Google Fonts.
// O Service Worker fará o cache dinâmico deles durante o uso para evitar travamentos.
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './maskable_icon_x192.png',
  './maskable_icon_x512.png',
  './logo-cup.png', 
  './qr-code.png'   
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Cacheando ativos principais de forma segura...');
        // Tenta fazer o cache arquivo por arquivo. Se um der erro (ex: logo não encontrado), 
        // ele avisa no console mas NÃO quebra a instalação do app.
        return Promise.allSettled(
          ASSETS_TO_CACHE.map(asset => {
            return cache.add(asset).catch(err => {
              console.warn('[SW] Falha ao cachear o arquivo (ignorando erro):', asset, err);
            });
          })
        );
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
        // Se já está no cache, retorna instantaneamente
        if (cachedResponse) return cachedResponse;
        
        // Se não está no cache, busca na rede e salva para a próxima vez (Cache dinâmico)
        return fetch(event.request).then(networkResponse => {
          // Aceita status 200 ou respostas opacas (comum em fontes de terceiros)
          if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return networkResponse;
        }).catch(() => {
          // Fallback para caso o usuário esteja offline e o arquivo não esteja no cache
          return new Response('Você está offline. Conecte-se à internet.', {
            status: 503,
            statusText: 'Serviço indisponível offline'
          });
        });
      })
  );
});
