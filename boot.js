/* Braun OnLine — boot.js
 * Executa ANTES do body renderizar (bloqueia). Aplica dark mode,
 * checa versão e registra o Service Worker. Nenhuma dependência.
 *
 * ÚNICO lugar para subir a versão: APP_VERSION.
 * O sw.js deriva o nome do cache dessa versão (via ?v=).
 */
(function () {
  'use strict';

  // 0) Fontes do Google sem bloquear a 1ª pintura: a welcome screen aparece logo e as fontes entram depois
  //    (os <link> têm media="print"; ao carregar, passam para media="all").
  //    Quando as fontes estão prontas, marca <html class="fonts-ok"> e avisa o app (evento 'braun-fonts'):
  //    até lá os ícones ficam invisíveis (sem o nome em inglês) e a welcome screen espera para contar o tempo.
  var fontesProntas = false;
  function marcarFontesProntas() {
    if (fontesProntas) return;
    fontesProntas = true;
    document.documentElement.classList.add('fonts-ok');
    try { window.dispatchEvent(new Event('braun-fonts')); } catch (e) {}
  }
  try {
    var linksFonte = document.querySelectorAll('link[data-async-css]');
    var pendentes = linksFonte.length;
    var carregarFontes = function () {
      if (document.fonts && document.fonts.load) {
        Promise.all([
          document.fonts.load("24px 'Material Symbols Outlined'"),
          document.fonts.load("700 16px 'Inter'")
        ]).then(marcarFontesProntas, marcarFontesProntas);
      } else { marcarFontesProntas(); }
    };
    if (!pendentes) { carregarFontes(); }
    Array.prototype.forEach.call(linksFonte, function (l) {
      var contado = false;
      var ativar = function () { l.media = 'all'; };
      var concluir = function () { if (contado) return; contado = true; if (--pendentes <= 0) carregarFontes(); };
      l.addEventListener('load', function () { ativar(); concluir(); });
      l.addEventListener('error', concluir);
      setTimeout(function () { ativar(); concluir(); }, 4000);   // reserva: se o evento não vier, segue assim mesmo
    });
  } catch (e) { marcarFontesProntas(); }
  setTimeout(marcarFontesProntas, 5000);   // reserva final (rede muito lenta ou sem fontes em cache)

  // 1) Dark mode sem FOUC — aplica em <html>, CSS usa html.dark-mode
  try {
    if (localStorage.getItem('braun_dark_mode') === 'true') {
      document.documentElement.classList.add('dark-mode');
      // Barra de status preta já no primeiro paint (a meta theme-color existe antes deste script)
      var tc = document.querySelector('meta[name="theme-color"]');
      if (tc) tc.setAttribute('content', '#121212');
    }
  } catch (e) {}

  // 1a) Modo minimalista (só feriados) já no 1º quadro, sem piscar
  try { if (localStorage.getItem('braun_minimal_greeting') === 'true') document.documentElement.classList.add('modo-feriados'); } catch (e) {}

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
      }, nomePerfil ? 12000 : 20000);
    }
  } catch (e) {}

  // 2) Versão + sinal de update pendente
  var APP_VERSION = '2026.11.13a';
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
