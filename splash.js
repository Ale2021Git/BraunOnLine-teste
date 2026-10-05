(function () {
  'use strict';
  var el = document.getElementById('splash');
  if (!el) return;

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var MIN = reduce ? 300 : 1800;  // tempo mínimo para a animação completar
  var MAX = 5000;                 // trava de segurança
  var t0 = performance.now();
  var done = false;

  function hide() {
    if (done) return;
    done = true;
    var wait = Math.max(0, MIN - (performance.now() - t0));
    setTimeout(function () {
      el.classList.add('is-out');
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 500);
    }, wait);
  }

  window.hideSplash = hide;       // opcional: chamar quando os dados do calendário estiverem prontos
  if (document.readyState === 'complete') hide();
  else window.addEventListener('load', hide);
  setTimeout(hide, MAX);
})();
