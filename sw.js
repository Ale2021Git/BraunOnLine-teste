// Nome do cache - Incremente a versão sempre que fizer mudanças grandes
const CACHE_NAME = 'braun-v2.1';

// Lista de arquivos essenciais (Incluindo os novos screenshots do manifesto)
const assets = [
  './',
  './index.html',
  './manifest.json',
  './maskable_icon_x192.png',
  './maskable_icon_x512.png',
  './screenshot-mobile.png',
  './screenshot-desktop.png'
];

// 1. Instalação: Armazena os arquivos básicos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('PWA: Cacheando arquivos essenciais...');
      // Usamos return para garantir que a instalação só termine após o cache
      return cache.addAll(assets);
    })
  );
  self.skipWaiting();
});

// 2. Ativação: Limpeza de caches antigos
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
    })
  );
  self.clients.claim();
});

// 3. Interceptação (Fetch): Estratégia Stale-While-Revalidate melhorada
self.addEventListener('fetch', (event) => {
  // Ignora requisições que não sejam HTTP ou HTTPS (evita erro com extensões do Chrome)
  if (!(event.request.url.indexOf('http') === 0)) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Verifica se a resposta é válida e do tipo "basic" (mesma origem) antes de salvar
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Opcional: retornar uma página de erro offline específica aqui
        return cachedResponse;
      });

      return cachedResponse || fetchPromise;
    })
  );
});

