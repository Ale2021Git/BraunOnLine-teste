/* Braun OnLine — boot.js
 * Executa ANTES do body renderizar (bloqueia). Aplica dark mode,
 * checa versão e registra o Service Worker. Nenhuma dependência.
 *
 * ÚNICO lugar para subir a versão: APP_VERSION.
 * O sw.js deriva o nome do cache dessa versão (via ?v=).
 */
(function () {
  'use strict';

  // 1) Dark mode sem FOUC — aplica em <html>, CSS usa html.dark-mode
  try {
    if (localStorage.getItem('braun_dark_mode') === 'true') {
      document.documentElement.classList.add('dark-mode');
    }
  } catch (e) {}

  // 2) Versão + sinal de update pendente
  var APP_VERSION = '2026.10.03a';
  window.APP_VERSION = APP_VERSION;

  var storedVersion = null;
  try { storedVersion = localStorage.getItem('braun_app_version'); } catch (e) {}

  if (storedVersion !== APP_VERSION) {
    try { localStorage.setItem('braun_app_version', APP_VERSION); } catch (e) {}
    // Só sinaliza atualização se já havia uma versão anterior (não na 1ª instalação)
    if (storedVersion !== null) {
      try { localStorage.setItem('braun_update_pending', 'true'); } catch (e) {}
    }
  }

  // 3) Modo diagnóstico: abra o app com ?debug=1 para ver erros na tela
  try {
    if (/[?&]debug=1(&|$)/.test(location.search)) {
      var dbg = document.createElement('script');
      dbg.src = './debug.js';
      document.head.appendChild(dbg);
    }
  } catch (e) {}

  // 4) Service Worker (skip no iOS)
  if ('serviceWorker' in navigator) {
    var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (!isIOS) {
      window.addEventListener('load', function () {
        navigator.serviceWorker
          .register('./sw.js?v=' + encodeURIComponent(APP_VERSION))
          .then(function (reg) { console.log('PWA ready!', reg.scope); })
          .catch(function (err) { console.error('SW error:', err); });
      });
    }
  }
})();
