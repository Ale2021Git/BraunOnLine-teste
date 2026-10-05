// Versão vem de boot.js: register('./sw.js?v=' + APP_VERSION). Um único lugar para subir.
const VERSION = new URL(self.location.href).searchParams.get('v') || 'dev';
const CACHE_PREFIX = 'braun-online-';
const CACHE_NAME = CACHE_PREFIX + 'v' + VERSION;
const FONT_CACHE = 'braun-fonts-v1';
const OFFLINE_URL = './offline.html';
const NETWORK_TIMEOUT_MS = 4000;

// Essenciais: se algum falhar, a instalação falha (comportamento desejado)
const PRECACHE_CORE = [
  './',
  './index.html',
  './app.js',
  './boot.js',
  './manifest.json',
  './maskable_icon_x192.png',
  './maskable_icon_x512.png',
  './icon-512.png'
];

// Opcionais: se algum não existir, a instalação continua
const PRECACHE_OPTIONAL = [
  './splash.js',
  './offline.html',
  './icon-192.png',
  './qr-code.png'
];

const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

// Instalação
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(PRECACHE_CORE);
    await Promise.allSettled(PRECACHE_OPTIONAL.map((url) => cache.add(url)));
    await self.skipWaiting();
  })());
});

// Ativação: limpa caches antigos do app e avisa as páginas abertas
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    const antigos = keys.filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME);
    await Promise.all(antigos.map((k) => caches.delete(k)));
    await self.clients.claim();

    // Só avisa em atualização (não na primeira instalação)
    if (antigos.length) {
      const clientes = await self.clients.matchAll({ type: 'window' });
      clientes.forEach((c) => c.postMessage({ type: 'SW_UPDATED', version: VERSION }));
    }
  })());
});

// Network first com timeout: se a rede demorar, usa o cache
async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const buscarNoCache = () => cache.match(request, { ignoreSearch: request.mode === 'navigate' });

  const rede = fetch(request).then((response) => {
    if (response && response.status === 200 && response.type === 'basic') {
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  });

  const respostaLenta = new Promise((resolve) => {
    setTimeout(async () => {
      const cached = await buscarNoCache();
      if (cached) resolve(cached);
    }, NETWORK_TIMEOUT_MS);
  });

  try {
    return await Promise.race([rede, respostaLenta]);
  } catch (_) {
    const cached = await buscarNoCache();
    if (cached) return cached;

    if (request.mode === 'navigate') {
      // O app funciona 100% local: abre o app em cache antes da página offline
      return (await cache.match('./index.html'))
        || (await cache.match(OFFLINE_URL))
        || new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
    }
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

// Fontes do Google: cache próprio (não é apagado a cada versão)
async function fontesStaleWhileRevalidate(event) {
  const request = event.request;
  const cache = await caches.open(FONT_CACHE);
  const cached = await cache.match(request);

  const atualizar = fetch(request).then((response) => {
    if (response && (response.ok || response.type === 'opaque')) {
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  }).catch(() => null);

  event.waitUntil(atualizar);
  if (cached) return cached;
  return (await atualizar) || new Response('', { status: 504, statusText: 'Gateway Timeout' });
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (FONT_HOSTS.includes(url.hostname)) {
    event.respondWith(fontesStaleWhileRevalidate(event));
    return;
  }

  if (url.origin !== self.location.origin) return;

  event.respondWith(networkFirst(request));
});

// Recebe mensagens do app (para forçar atualização)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
