// ============================================================================
// ATENÇÃO: Sempre que alterar o index.html ou qualquer arquivo local, 
// mude a string ou a data abaixo (ex: v3.1, v4, etc.) para forçar o update!
// ============================================================================
const CACHE_NAME = 'braun-online-v3.3-2026_rev2'; 

const LOCAL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './maskable_icon_x192.png',
  './maskable_icon_x512.png',
  './logo-cup.png',
  './qr-code.png'
];

// Instalação do Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Cacheando ativos iniciais...');
        return cache.addAll(LOCAL_ASSETS);
      })
      .catch(err => console.error('[SW] Erro no cache inicial:', err))
      .then(() => self.skipWaiting()) // Força o SW a se tornar ativo sem esperar
  );
});

// Ativação e limpeza de versões antigas
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => {
        if (key !== CACHE_NAME) {
          console.log('[SW] Removendo cache antigo:', key);
          return caches.delete(key);
        }
      })
    )).then(() => self.clients.claim()) // Assume o controle das páginas imediatamente
  );
});

// Interceptação de requisições (Fetch)
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isLocal = url.origin === self.location.origin;

  event.respondWith(
    caches.match(event.request).then(cached => {
      
      // Se for um recurso local (index.html, imagens da lista, etc)
      // Usamos Stale-While-Revalidate: entrega o cache rápido, mas atualiza em background
      if (isLocal) {
        const fetchPromise = fetch(event.request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return networkResponse;
        }).catch(() => {
          // Fallback offline se a rede falhar e não tiver nada no cache
          if (event.request.destination === 'document') {
            return caches.match('./index.html');
          }
        });

        // Retorna o que está no cache IMEDIATAMENTE, ou espera a rede se não houver cache
        return cached || fetchPromise;
      }

      // Para recursos EXTERNOS (APIs, fontes do google, etc), mantém a sua lógica original
      if (cached) return cached;

      return fetch(event.request).then(res => {
        // Cacheia recursos externos bem-sucedidos (opcional)
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return res;
      }).catch(() => {
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
        return new Response('Offline', { status: 503 });
      });

    })
  );
});
