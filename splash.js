(function () {
  'use strict';
  // Fontes do Google sem bloquear a 1ª pintura (a CSP não permite onload inline):
  // carregam como "print" e viram "all" quando terminam de baixar.
  Array.prototype.forEach.call(document.querySelectorAll('link[data-async-css]'), function (l) {
    if (l.sheet) { l.media = 'all'; return; }
    l.addEventListener('load', function () { l.media = 'all'; });
  });

  var el = document.getElementById('splash');
  if (!el) return;

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var MIN = reduce ? 300 : 1800;  // tempo mínimo para a animação completar
  var MAX = 5000;                 // trava de segurança
  var t0 = performance.now();
  var done = false;

  // barra de status roxa durante a splash; restaura a cor original ao sair
  var meta = document.querySelector('meta[name="theme-color"]');
  var corOriginal = meta ? meta.getAttribute('content') : null;
  if (meta) meta.setAttribute('content', '#7030A0');

  function hide() {
    if (done) return;
    done = true;
    var wait = Math.max(0, MIN - (performance.now() - t0));
    setTimeout(function () {
      el.classList.add('is-out');
      if (meta && corOriginal) meta.setAttribute('content', corOriginal);
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 500);
    }, wait);
  }

  window.hideSplash = hide;       // opcional: chamar quando os dados do calendário estiverem prontos
  if (document.readyState === 'complete') hide();
  else window.addEventListener('load', hide);
  setTimeout(hide, MAX);
})();
