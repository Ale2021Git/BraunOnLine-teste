self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Cacheando ativos principais de forma segura...');
        // Tenta fazer o cache arquivo por arquivo. Se um der erro 404, não quebra o app.
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
