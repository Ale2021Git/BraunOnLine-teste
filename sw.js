 ============================================================
//  Braun OnLine — Service Worker v3.4
//  ✅ CORRIGIDO: Suporte OFFLINE completo
//  ✅ Adicionado: Página fallback offline.html
//  ✅ Adicionado: Aviso de nova versão para os colaboradores
//  ✅ Melhorado: Cache de navegação e assets externos
//  ✅ Mantido: Alarmes, notificações e sync
// ============================================================

const CACHE_NAME = 'braun-v3.4';

// Assets locais (sempre em cache - ESSENCIAIS PARA OFFLINE)
const LOCAL_ASSETS = [
  './',
  './index.html',
  './offline.html',
  './manifest.json',
  './maskable_icon_x192.png',
  './maskable_icon_x512.png',
  './qr-code.png'
];

// Assets externos (tentamos cachear, mas não bloqueiam a instalação)
const EXTERNAL_ASSETS = [
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&family=JetBrains+Mono:wght@700&display=swap',
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap'
];

// ─── Alarmes agendados em memória (persistidos via postMessage) ──────────────
let alarmesAgendados = [];
let _checkInterval   = null;

// ─── INSTALAÇÃO ──────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando versão', CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Assets locais: falha completa se não conseguir (crítico)
      await cache.addAll(LOCAL_ASSETS);
      console.log('[SW] Assets locais cacheados com sucesso');

      // Assets externos: tentativa silenciosa (não bloqueia instalação)
      await Promise.allSettled(
        EXTERNAL_ASSETS.map(url =>
          fetch(url, { mode: 'no-cors' })
            .then(res => {
              if (res && res.status === 200) {
                return cache.put(url, res);
              }
            })
            .catch(() => { /* ignora falha de recurso externo */ })
        )
      );
      console.log('[SW] Assets externos processados');
    })
  );
  // Ativa imediatamente sem esperar a aba ser fechada
  self.skipWaiting();
});

// ─── ATIVAÇÃO ────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[SW] Ativando e limpando caches antigos...');
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => {
            console.log('[SW] Removendo cache antigo:', name);
            return caches.delete(name);
          })
      )
    ).then(() => {
      // 🔔 NOVO: AVISA PARA TODAS AS ABAS QUE O SW FOI ATUALIZADO
      return self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    }).then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'SW_UPDATED',
          version: CACHE_NAME,
          timestamp: Date.now()
        });
      });
      console.log('[SW] Aviso de atualização enviado para', clients.length, 'aba(s)');
    }).then(() => self.clients.claim())
  );
});

// ─── FETCH — Estratégia OFFLINE-FIRST com fallback ──────────────────────────
self.addEventListener('fetch', (event) => {
  // Ignora requisições não-HTTP (chrome-extension://, etc.)
  if (!event.request.url.startsWith('http')) return;
  
  const url = new URL(event.request.url);
  
  // ============================================
  // ESTRATÉGIA ESPECIAL PARA NAVEGAÇÃO (HTML)
  // ============================================
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Se deu certo, cacheia a resposta e retorna
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(async () => {
          // Se falhou (offline), tenta o cache
          const cachedResponse = await caches.match(event.request);
          if (cachedResponse) {
            return cachedResponse;
          }
          // Fallback final: página offline personalizada
          const offlinePage = await caches.match('./offline.html');
          if (offlinePage) {
            return offlinePage;
          }
          // Último recurso: mensagem de erro simples
          return new Response('Você está offline. Conecte-se para acessar o Braun OnLine.', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({ 'Content-Type': 'text/plain' })
          });
        })
    );
    return;
  }
  
  // ============================================
  // PARA OUTROS RECURSOS (CSS, JS, IMAGENS)
  // Estratégia: Stale-While-Revalidate
  // ============================================
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            caches.open(CACHE_NAME).then((cache) =>
              cache.put(event.request, networkRes.clone())
            );
          }
          return networkRes;
        })
        .catch(() => {
          // Sem rede e sem cache? Retorna um placeholder para imagens
          if (event.request.url.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i)) {
            return new Response('', { status: 200, statusText: 'OK' });
          }
          return cached;
        });
      
      // Retorna cache imediatamente se disponível; atualiza em segundo plano
      return cached || networkFetch;
    })
  );
});

// ─── MENSAGENS DO APP PRINCIPAL ──────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (!event.data || !event.data.type) return;

  switch (event.data.type) {

    // Forçar atualização (legado)
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    // Exibe notificação imediata solicitada pelo app
    case 'SHOW_NOTIFICATION': {
      const { title, body, icon } = event.data;
      self.registration.showNotification(title || 'Braun OnLine', {
        body: body || '',
        icon: icon || './maskable_icon_x192.png',
        badge: './maskable_icon_x192.png',
        vibrate: [200, 100, 200, 100, 400],
        requireInteraction: true,
        tag: 'braun-alarme'
      });
      break;
    }

    // Adiciona/atualiza um alarme único
    case 'SCHEDULE_ALARM': {
      const alarme = event.data.alarme;
      if (!alarme) break;
      // Remove duplicata e adiciona
      alarmesAgendados = alarmesAgendados.filter(a => a.id !== alarme.id);
      if (alarme.ativo) alarmesAgendados.push(alarme);
      _iniciarVerificadorSW();
      break;
    }

    // Substitui toda a lista de alarmes (sync completo)
    case 'SYNC_ALARMS': {
      alarmesAgendados = (event.data.alarmes || []).filter(a => a.ativo);
      _iniciarVerificadorSW();
      break;
    }
  }
});

// ─── VERIFICADOR DE ALARMES NO SW (segundo plano) ────────────────────────────
function _iniciarVerificadorSW() {
  if (_checkInterval) return; // Já rodando
  _checkInterval = setInterval(_verificarAlarmesSW, 60_000);
}

function _verificarAlarmesSW() {
  if (alarmesAgendados.length === 0) return;

  const agora   = new Date();
  const hora    = agora.getHours();
  const minuto  = agora.getMinutes();

  alarmesAgendados.forEach((alarme) => {
    if (alarme.hora !== hora || alarme.minuto !== minuto) return;
    if (!_isDiaTrabalhoSW(agora, alarme)) return;

    const regionLabels = { BR: 'ECOFLAC', MNT: 'MANUTENÇÃO' };
    const turmaLabels  = { AC: 'Turma A/C', BD: 'Turma B/D', EG: 'Turma E/G', FH: 'Turma F/H' };
    const hh = String(alarme.hora).padStart(2, '0');
    const mm = String(alarme.minuto).padStart(2, '0');

    self.registration.showNotification(`⏰ Braun OnLine — ${hh}:${mm}`, {
      body: `Hoje você trabalha! ${regionLabels[alarme.region] || alarme.region} · ${turmaLabels[alarme.turma] || alarme.turma}`,
      icon:  './maskable_icon_x192.png',
      badge: './maskable_icon_x192.png',
      vibrate: [300, 150, 300, 150, 600],
      requireInteraction: true,
      tag: `alarme_${alarme.id}`
    });
  });
}

// Replica a lógica de escala do app (necessário no SW pois não tem acesso ao DOM)
function _isDiaTrabalhoSW(dt, alarme) {
  const diff = (ref) =>
    Math.floor((dt.getTime() - ref.getTime()) / 86_400_000);

  if (alarme.region === 'BR') {
    const base  = new Date(2026, 0, 18);
    const ciclo = ((diff(base) % 4) + 4) % 4;
    const isA   = ciclo < 2;
    return (alarme.turma === 'AC' && isA) || (alarme.turma === 'BD' && !isA);
  } else {
    const base  = new Date(2026, 2, 6);
    const ciclo = ((diff(base) % 4) + 4) % 4;
    const isEG  = ciclo < 2;
    return (alarme.turma === 'EG' ? isEG : !isEG);
  }
}

// ─── PUSH (servidor externo, ex.: Firebase) ──────────────────────────────────
self.addEventListener('push', (event) => {
  let data = { title: 'Braun OnLine', body: 'Há novidades na sua escala!' };
  if (event.data) {
    try { data = event.data.json(); }
    catch { data = { title: 'Braun OnLine', body: event.data.text() }; }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body:  data.body,
      icon:  './maskable_icon_x192.png',
      badge: './maskable_icon_x192.png',
      vibrate: [100, 50, 100],
      data: { dateOfArrival: Date.now() }
    })
  );
});

// ─── CLIQUE NA NOTIFICAÇÃO ───────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Foca aba já aberta se existir
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      // Caso contrário abre nova aba
      return clients.openWindow('./');
    })
  );
});
