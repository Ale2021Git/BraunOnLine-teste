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
      // Barra de status preta já no primeiro paint (a meta theme-color existe antes deste script)
      var tc = document.querySelector('meta[name="theme-color"]');
      if (tc) tc.setAttribute('content', '#121212');
    }
  } catch (e) {}

  // 1a) Splash (imagem) no 1º quadro. A welcome fica em espera (animações pausadas) até a splash sair.
  try {
    document.documentElement.classList.add('splash-on', 'splash-hold');
    var tcs = document.querySelector('meta[name="theme-color"]');
    if (tcs) tcs.setAttribute('content', '#00A97A');
    // Trava de segurança: se o app.js falhar, a splash não prende o usuário
    setTimeout(function () {
      document.documentElement.classList.remove('splash-on', 'splash-hold');
      var sp = document.getElementById('splash');
      if (sp && sp.parentNode) sp.parentNode.removeChild(sp);
    }, 4500);
  } catch (e) {}

  // 1b) Boas-vindas já no 1º quadro: com nome no perfil, ou na 1ª visita.
  //     A classe faz o CSS exibir a tela antes do app.js carregar; o app.js preenche textos e fecha.
  try {
    var nomePerfil = (localStorage.getItem('braun_nome_completo') || '').trim();
    var jaVisitou = localStorage.getItem('braun_visited');
    if (nomePerfil || !jaVisitou) {
      document.documentElement.classList.add('welcome-on');
      var tcw = document.querySelector('meta[name="theme-color"]');
      if (tcw) tcw.setAttribute('content', '#00A97A');
      // Trava de segurança: se o app.js falhar, a tela não prende o usuário
      setTimeout(function () {
        document.documentElement.classList.remove('welcome-on');
        var w = document.getElementById('welcomeScreen');
        if (w) w.style.display = 'none';
      }, nomePerfil ? 8000 : 20000);
    }
  } catch (e) {}

  // 2) Versão + sinal de update pendente
  var APP_VERSION = '2026.11.01b';
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
