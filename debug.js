/* Braun OnLine — debug.js
 * Painel de diagnóstico na tela. Só é carregado quando a URL tem ?debug=1
 * (ver boot.js). Não altera nenhum dado do app.
 */
(function () {
  'use strict';

  var linhas = [];
  var painel, corpo;

  function hora() {
    var d = new Date();
    return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) + ':' + ('0' + d.getSeconds()).slice(-2);
  }

  function log(msg, erro) {
    var txt = hora() + ' ' + msg;
    linhas.push(txt);
    if (!corpo) return;
    var l = document.createElement('div');
    l.textContent = txt;
    l.style.cssText = 'padding:2px 0;border-bottom:1px solid #333;word-break:break-word;' + (erro ? 'color:#ff8a80;font-weight:700;' : '');
    corpo.appendChild(l);
    corpo.scrollTop = corpo.scrollHeight;
  }

  function criarPainel() {
    if (painel || !document.body) return;
    painel = document.createElement('div');
    painel.id = 'braun-debug';
    painel.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:2147483647;max-height:45vh;display:flex;flex-direction:column;background:rgba(0,0,0,0.92);color:#e0e0e0;font:11px/1.35 monospace;';
    var barra = document.createElement('div');
    barra.style.cssText = 'display:flex;gap:8px;padding:6px;background:#111;';
    function botao(rotulo, fn) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = rotulo;
      b.style.cssText = 'flex:1;padding:8px;border:0;border-radius:6px;background:#00A97A;color:#fff;font-weight:700;font-size:12px;';
      b.addEventListener('click', function (e) { e.stopPropagation(); fn(); });
      barra.appendChild(b);
    }
    botao('COPIAR', function () {
      var t = linhas.join('\n');
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(t).then(function () { log('copiado'); }, function () { log('falha ao copiar', true); });
      } else { log('clipboard indisponível', true); }
    });
    botao('FECHAR', function () { painel.style.display = 'none'; });
    corpo = document.createElement('div');
    corpo.style.cssText = 'overflow:auto;padding:6px;-webkit-overflow-scrolling:touch;';
    painel.appendChild(barra);
    painel.appendChild(corpo);
    document.body.appendChild(painel);
    linhas.forEach(function (t) {
      var l = document.createElement('div');
      l.textContent = t;
      l.style.cssText = 'padding:2px 0;border-bottom:1px solid #333;word-break:break-word;';
      corpo.appendChild(l);
    });
  }

  // 1) Erros de JavaScript
  window.addEventListener('error', function (e) {
    var onde = (e.filename || '').split('/').pop() + ':' + (e.lineno || '?') + ':' + (e.colno || '?');
    log('ERRO ' + (e.message || 'desconhecido') + ' @ ' + onde, true);
  });
  window.addEventListener('unhandledrejection', function (e) {
    var r = e.reason;
    log('PROMISE ' + (r && r.message ? r.message : String(r)), true);
  });

  // 2) Estado do app depois do carregamento
  var ACOES = {
    'open-colaborador': 'colaboradorDoMesCard',
    'open-pedidos': 'meusPedidosCard',
    'open-config': 'configCard'
  };

  function estado() {
    log('versão boot: ' + (window.APP_VERSION || 'ausente'));
    log('tela: ' + window.innerWidth + 'x' + window.innerHeight + ' · online: ' + navigator.onLine);

    if ('serviceWorker' in navigator) {
      var c = navigator.serviceWorker.controller;
      log('SW controlando: ' + (c ? c.scriptURL.split('/').pop() : 'não'));
    } else { log('SW: sem suporte'); }

    var temMapa = (typeof ACTION_MAP !== 'undefined');
    log('app.js carregou (ACTION_MAP): ' + (temMapa ? 'sim' : 'NÃO'), !temMapa);
    if (temMapa) {
      Object.keys(ACOES).forEach(function (a) {
        var ok = typeof ACTION_MAP[a] === 'function';
        log('ação ' + a + ': ' + (ok ? 'ok' : 'AUSENTE'), !ok);
      });
    }

    ['overlay', 'hamburgerDrawer', 'colaboradorDoMesCard', 'meusPedidosCard', 'configCard', 'banner-avisos', 'bannerContent'].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) log('elemento #' + id + ': NÃO EXISTE', true);
    });

    try {
      var logs = JSON.parse(localStorage.getItem('logs_v26') || '{}');
      log('notas salvas: ' + Object.keys(logs).length);
    } catch (e) { log('logs_v26 inválido: ' + e.message, true); }
    log('férias definidas: ' + (!!localStorage.getItem('braun_ferias_inicio') && !!localStorage.getItem('braun_ferias_fim') ? 'sim' : 'não'));

    var b = document.getElementById('banner-avisos');
    if (b) log('faixa de avisos visível: ' + (b.classList.contains('show') ? 'sim' : 'não (sem férias/notas futuras)'));

    var internos = window.__braunErrors || [];
    log('erros capturados pelo app: ' + internos.length, internos.length > 0);
    internos.forEach(function (m) { log('  ' + m, true); });

    log('--- toque nos itens do menu para testar ---');
  }

  // 3) Rastreia os toques nos itens com data-action
  document.addEventListener('click', function (e) {
    var el = e.target && e.target.closest ? e.target.closest('[data-action]') : null;
    if (!el) return;
    var a = el.getAttribute('data-action');
    var temFn = (typeof ACTION_MAP !== 'undefined') && typeof ACTION_MAP[a] === 'function';
    log('toque: ' + a + ' → handler ' + (temFn ? 'existe' : 'AUSENTE'), !temFn);
    setTimeout(function () {
      var abertos = [].map.call(document.querySelectorAll('.bottom-modal.show'), function (m) { return m.id; });
      log('modais abertos: ' + (abertos.length ? abertos.join(', ') : 'nenhum'), !abertos.length && !!ACOES[a]);
      var alvo = ACOES[a] && document.getElementById(ACOES[a]);
      if (alvo) {
        var r = alvo.getBoundingClientRect();
        var cs = getComputedStyle(alvo);
        log('#' + alvo.id + ' top=' + Math.round(r.top) + ' altura=' + Math.round(r.height) + ' display=' + cs.display + ' visib=' + cs.visibility + ' z=' + cs.zIndex);
      }
    }, 700);
  }, true);

  function iniciar() {
    criarPainel();
    log('debug ativo');
    setTimeout(estado, 1200);
  }

  if (document.readyState === 'complete') iniciar();
  else window.addEventListener('load', iniciar);
})();
