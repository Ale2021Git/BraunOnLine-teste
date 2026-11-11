/* Braun OnLine — app.js
 * Versão 3.11 · 2026/2027
 */
'use strict';

/* ============================================================
   0) CONFIGURAÇÕES EDITÁVEIS
   ============================================================ */
const EMAILS_PEDIDOS = ['rubens.santos@bbraun.com', 'rafael3.silva@bbraun.com'];   // destinatários (campo Para)

/* ============================================================
   1) CONSTANTES DE CONFIGURAÇÃO
   ============================================================ */
const ESCALA_CONFIG = Object.freeze({
  BR:    { baseDate: new Date(2026, 0, 18), cicloDias: 4, metadeCiclo: 2 },
  MNT:   { baseDate: new Date(2026, 2, 6),  cicloDias: 4, metadeCiclo: 2 },
  '1x1': { baseDate: new Date(2026, 0, 1) }
});

const SCHEMA_VERSION = 1;

const BACKUP_KEYS = [
  'braun_nome_completo','braun_matricula','braun_turma_perfil','braun_ano','braun_setor',
  'braun_last_region','braun_turma_BR','braun_turma_MNT','braun_turma_1x1',
  'braun_ferias_inicio','braun_ferias_fim','braun_dark_mode',
  'braun_minimal_greeting','braun_voice_response','braun_voz_genero','braun_voz_nome_f','braun_voz_nome_m','braun_haptic',
  'braun_cartilhas_lidas','braun_conquistas','braun_quizzes_acertados','braun_quiz_ok','braun_quiz_melhor',
  'braun_novidades_lidas','logs_v26'
];

/* ============================================================
   2) STORAGE HELPERS
   ============================================================ */
function getStorageValue(key) {
  try { return localStorage.getItem(key); } catch (e) {
    try { return sessionStorage.getItem(key); } catch (f) { return null; }
  }
}
function getJSON(key, fallback) {
  try {
    const raw = getStorageValue(key);
    if (raw === null || raw === undefined || raw === '') return fallback;
    const v = JSON.parse(raw);
    if (Array.isArray(fallback)) return Array.isArray(v) ? v : fallback;
    return (v !== null && typeof v === 'object' && !Array.isArray(v)) ? v : fallback;
  } catch (e) { return fallback; }
}
window.__braunErrors = window.__braunErrors || [];
function registrarErro(onde, err) {
  try {
    window.__braunErrors.push(onde + ': ' + (err && err.message ? err.message : String(err)));
    console.error('[Braun] ' + onde, err);
  } catch (e) {}
}
function safeRun(nome, fn) {
  try { fn(); } catch (err) { registrarErro(nome, err); }
}
function setStorageValue(key, value) {
  try { localStorage.setItem(key, value); } catch (e) {
    try { sessionStorage.setItem(key, value); } catch (f) {}
  }
}
function removeStorageValue(key) {
  try { localStorage.removeItem(key); } catch (e) {
    try { sessionStorage.removeItem(key); } catch (f) {}
  }
}

/* ============================================================
   3) UTILITÁRIOS
   ============================================================ */
function dec(str) {
  if (!str) return '';
  var txt = document.createElement('textarea');
  txt.innerHTML = str;
  return txt.value;
}
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
function haptic(ms) { /* no-op — API desativada */ }

/* ============================================================
   4) TOAST SYSTEM
   ============================================================ */
function toast(mensagem, tipo, duracaoMs) {
  tipo = tipo || 'info';
  duracaoMs = duracaoMs || 3200;
  const container = document.getElementById('toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = 'toast ' + tipo;
  const icones = { sucesso: 'check_circle', erro: 'error', info: 'info', aviso: 'warning' };
  el.innerHTML = '<span class="material-symbols-outlined">' + (icones[tipo] || 'info') + '</span><div class="toast-msg">' + escapeHtml(mensagem) + '</div>';
  container.appendChild(el);
  setTimeout(function () {
    el.classList.add('saindo');
    setTimeout(function () { el.remove(); }, 320);
  }, duracaoMs);
}
function toastConfirm(mensagem, onConfirm) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = 'toast aviso';
  el.innerHTML = '<span class="material-symbols-outlined">help</span><div style="flex:1;"><div class="toast-msg">' + escapeHtml(mensagem) + '</div><div class="toast-actions"><button data-action="ok">Confirmar</button><button data-action="cancel" class="secundario">Cancelar</button></div></div>';
  el.querySelector('[data-action="ok"]').addEventListener('click', function () { el.remove(); onConfirm(true); });
  el.querySelector('[data-action="cancel"]').addEventListener('click', function () { el.remove(); onConfirm(false); });
  container.appendChild(el);
  setTimeout(function () { if (el.parentNode) el.remove(); }, 8000);
}

/* ============================================================
   5) LRU CACHE
   ============================================================ */
function LRUCache(max) { this.max = max || 800; this.map = new Map(); }
LRUCache.prototype.get = function (k) { if (!this.map.has(k)) return undefined; var v = this.map.get(k); this.map.delete(k); this.map.set(k, v); return v; };
LRUCache.prototype.set = function (k, v) { if (this.map.has(k)) this.map.delete(k); this.map.set(k, v); if (this.map.size > this.max) { var f = this.map.keys().next().value; this.map.delete(f); } };
LRUCache.prototype.clear = function () { this.map.clear(); };

/* ============================================================
   6) MODAL FOCUS TRAP
   ============================================================ */
let activeModalElement = null;
let lastFocusedElement = null;
const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

function trapFocus(e) {
  if (!activeModalElement) return;
  const focusable = activeModalElement.querySelectorAll(FOCUSABLE);
  if (!focusable.length) return;
  const first = focusable[0], last = focusable[focusable.length - 1];
  const isTab = e.key === 'Tab' || e.keyCode === 9;
  if (!isTab) return;
  if (e.shiftKey) { if (document.activeElement === first) { e.preventDefault(); last.focus(); } }
  else { if (document.activeElement === last) { e.preventDefault(); first.focus(); } }
}
function prepararModais() {
  document.querySelectorAll('.bottom-modal').forEach(function (m) {
    if (m.querySelector('.modal-bar')) return;
    const bar = document.createElement('div'); bar.className = 'modal-bar';
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'modal-x';
    btn.setAttribute('data-action', 'close-modals'); btn.setAttribute('aria-label', 'Voltar');
    btn.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">undo</span><span>Voltar</span>';
    bar.appendChild(btn); m.insertBefore(bar, m.firstChild);
  });
}
function focusModal(modalId) {
  const overlay = document.getElementById('overlay');
  const modal = document.getElementById(modalId);
  if (!modal) return;
  // Garante que o menu lateral (z-index 3600) nunca fique por cima de um modal (z-index 2000)
  const drawer = document.getElementById('hamburgerDrawer');
  if (drawer && drawer.classList.contains('open')) closeHamburger();
  lastFocusedElement = document.activeElement;
  overlay.style.display = 'block';
  modal.scrollTop = 0;
  modal.classList.add('show');
  requestAnimationFrame(function () { modal.scrollTop = 0; });
  const main = document.getElementById('main-content');
  const header = document.querySelector('header');
  if (main) main.setAttribute('aria-hidden', 'true');
  if (header) header.setAttribute('aria-hidden', 'true');
  if (activeModalElement) document.removeEventListener('keydown', trapFocus);
  activeModalElement = modal;
  document.addEventListener('keydown', trapFocus);
  const focaveis = Array.prototype.slice.call(modal.querySelectorAll(FOCUSABLE));
  const first = focaveis.filter(function (el) { return !el.classList.contains('modal-x'); })[0] || focaveis[0];
  // preventScroll: na Privacidade o único item focável (além do Voltar) é o botão "Entendi", no fim da tela;
  // sem isso o navegador rola até ele e a aba abre no meio, com o cabeçalho escondido.
  if (first) setTimeout(function () { first.focus({ preventScroll: true }); modal.scrollTop = 0; }, 50);
}
function closeAllModals() {
  if (typeof pararVoz === 'function') pararVoz();
  document.getElementById('overlay').style.display = 'none';
  document.querySelectorAll('.bottom-modal').forEach(function (el) { el.classList.remove('show'); });
  document.removeEventListener('keydown', trapFocus);
  activeModalElement = null;
  const main = document.getElementById('main-content');
  const header = document.querySelector('header');
  if (main) main.removeAttribute('aria-hidden');
  if (header) header.removeAttribute('aria-hidden');
  if (lastFocusedElement && lastFocusedElement.focus) { lastFocusedElement.focus(); lastFocusedElement = null; }
}

/* ============================================================
   7) CACHES E FERIADOS
   ============================================================ */
let cachedFerias = null;
function getFeriasRange() {
  if (cachedFerias) return cachedFerias;
  cachedFerias = { inicio: getStorageValue('braun_ferias_inicio'), fim: getStorageValue('braun_ferias_fim') };
  return cachedFerias;
}
function clearFeriasCache() { cachedFerias = null; }

const _escalaCache = new LRUCache(800);
const weekNumberCache = new LRUCache(900);
let cachedStats = {};
let feriadosCache = {};

function calculaPascoa(ano) {
  const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(ano, mes - 1, dia);
}
function getFeriados(ano) {
  if (feriadosCache[ano]) return feriadosCache[ano];
  const f = {
    '01-01':'Ano Novo','04-21':'Tiradentes','04-23':'São Jorge','05-01':'Dia do Trabalho',
    '09-07':'Independência','09-22':'Aniv. São Gonçalo','10-12':'N. S. Aparecida',
    '11-02':'Finados','11-15':'Proclamação da República','12-25':'Natal'
  };
  const p = calculaPascoa(ano);
  const car = new Date(p.getTime() - 47 * 86400000);
  const ss = new Date(p.getTime() - 2 * 86400000);
  const ck = String(car.getMonth() + 1).padStart(2, '0') + '-' + String(car.getDate()).padStart(2, '0');
  const sk = String(ss.getMonth() + 1).padStart(2, '0') + '-' + String(ss.getDate()).padStart(2, '0');
  if (!f[ck]) f[ck] = 'Carnaval';
  if (!f[sk]) f[sk] = 'Sexta-Feira Santa';
  feriadosCache[ano] = f;
  return f;
}
function getWeekNumberCached(d) {
  const key = d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate();
  let v = weekNumberCache.get(key);
  if (v !== undefined) return v;
  v = getWeekNumber(d);
  weekNumberCache.set(key, v);
  return v;
}
function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const ys = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - ys) / 86400000) + 1) / 7);
}

/* ============================================================
   8) ESTADO GLOBAL
   ============================================================ */
let currentRegion = getStorageValue('braun_last_region') || 'BR';
let dataAtiva = '';
const translations = {
  BR:    { statusTrab: 'TRABALHANDO', statusFolga: 'DE FOLGA',  days: ['S','T','Q','Q','S','S','D'] },
  MNT:   { statusTrab: 'TRABALHANDO', statusFolga: 'FOLGA MNT', days: ['S','T','Q','Q','S','S','D'] },
  '1x1': { statusTrab: 'TRABALHANDO', statusFolga: 'FOLGA 1x1', days: ['S','T','Q','Q','S','S','D'] }
};
let currentAno = parseInt(getStorageValue('braun_ano')) || 2026;
let currentTurma = getStorageValue('braun_turma_' + currentRegion) || 'AC';
let mesAtualVisivel = new Date().getMonth();
let anoAtualVisivel = currentAno;

/* ============================================================
   9) LÓGICA DE ESCALA
   ============================================================ */
function checkBR(dt, t) {
  const k = 'BR_' + dt.getFullYear() + '_' + dt.getMonth() + '_' + dt.getDate() + '_' + t;
  let v = _escalaCache.get(k); if (v !== undefined) return v;
  const c = ESCALA_CONFIG.BR;
  const diff = Math.floor((dt.getTime() - c.baseDate.getTime()) / 86400000);
  const isA = (((diff % c.cicloDias) + c.cicloDias) % c.cicloDias) < c.metadeCiclo;
  v = { isA: isA, trab: (t === 'AC' && isA) || (t === 'BD' && !isA) };
  _escalaCache.set(k, v); return v;
}
function checkMnt(dt, t) {
  const k = 'MNT_' + dt.getFullYear() + '_' + dt.getMonth() + '_' + dt.getDate() + '_' + t;
  let v = _escalaCache.get(k); if (v !== undefined) return v;
  const c = ESCALA_CONFIG.MNT;
  const diff = Math.floor((dt.getTime() - c.baseDate.getTime()) / 86400000);
  const ciclo = ((diff % c.cicloDias) + c.cicloDias) % c.cicloDias;
  const isEG = ciclo < c.metadeCiclo;
  v = { isEG: isEG, trab: (t === 'EG' ? isEG : !isEG) };
  _escalaCache.set(k, v); return v;
}
function check1x1(dt, turma) {
  const k = '1x1_' + dt.getFullYear() + '_' + dt.getMonth() + '_' + dt.getDate() + '_' + turma;
  let v = _escalaCache.get(k); if (v !== undefined) return v;
  const c = ESCALA_CONFIG['1x1'];
  const diff = Math.floor((dt.getTime() - c.baseDate.getTime()) / 86400000);
  const isEquipeA = (turma === '1x1A' || turma === '1x1C');
  const par = (((diff % 2) + 2) % 2) === 0;
  const trab = isEquipeA ? par : !par;
  v = { trab: trab, isEquipeA: isEquipeA };
  _escalaCache.set(k, v); return v;
}
function isTurnoNoite1x1(t) { return t === '1x1C' || t === '1x1D'; }
function isTrabalhando(dt, r, t) {
  if (r === 'BR') return checkBR(dt, t).trab;
  if (r === '1x1') return check1x1(dt, t).trab;
  return checkMnt(dt, t).trab;
}
function isFerias(dt) {
  const r = getFeriasRange();
  if (!r.inicio || !r.fim) return false;
  const d = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime();
  return d >= new Date(r.inicio + 'T00:00:00').getTime() && d <= new Date(r.fim + 'T00:00:00').getTime();
}
function getDataRetorno() {
  const range = getFeriasRange();
  if (!range.fim) return null;
  const fim = new Date(range.fim + 'T00:00:00');
  const d = new Date(fim.getTime());
  for (let i = 0; i < 30; i++) {
    d.setDate(d.getDate() + 1);
    if (isTrabalhando(d, currentRegion, currentTurma)) return new Date(d.getTime());
  }
  return null;
}
function diaDaSemanaPorExtenso(d) {
  return ['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'][d.getDay()];
}
function formatarTurmaParaVoz(t) {
  if (!t) return '';
  if (t === '1x1A') return '1x1 manhã equipe A';
  if (t === '1x1B') return '1x1 manhã equipe B';
  if (t === '1x1C') return '1x1 noite equipe A';
  if (t === '1x1D') return '1x1 noite equipe B';
  if (t.length !== 2) return t;
  return t.split('').join(' e ');
}
function nomeRegiao(r) {
  if (r === 'BR') return 'ECOFLAC';
  if (r === '1x1') return '1x1';
  return 'MANUTENÇÃO';
}

/* ============================================================
   10) RELÓGIO + CONTADOR DE FÉRIAS
   ============================================================ */
let clockInterval = null;
function startClock() {
  if (clockInterval) clearInterval(clockInterval);
  clockInterval = setInterval(function () { if (document.visibilityState === 'visible') tick(); }, 1000);
}
document.addEventListener('visibilitychange', function () {
  if (document.visibilityState === 'hidden') { if (clockInterval) clearInterval(clockInterval); }
  else { startClock(); tick(); }
});
function modoFeriados() { return getStorageValue('braun_minimal_greeting') === 'true'; }
function aplicarModoFeriados() {
  const on = modoFeriados();
  document.documentElement.classList.toggle('modo-feriados', on);
  const sub = document.querySelector('[data-action="open-stats"] .drawer-item-sub');
  if (sub) sub.textContent = on ? 'Feriados do ano' : 'Dias trabalhados e folgas';
}
function feriadoDeHoje(now) { return getFeriados(now.getFullYear())[String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0')] || ''; }
function tick() {
  const now = new Date();
  const bc = document.getElementById('big-clock');
  if (bc) bc.innerText = now.toLocaleTimeString('pt-BR');
  const msg = document.getElementById('status-msg');
  if (msg) {
    if (getStorageValue('braun_minimal_greeting') === 'true') {
      const h = now.getHours();
      let s;
      if (h >= 5 && h < 12) s = 'BOM DIA';
      else if (h >= 12 && h < 18) s = 'BOA TARDE';
      else s = 'BOA NOITE';
      const fh = feriadoDeHoje(now);
      if (fh) { msg.innerText = 'FERIADO · ' + fh; msg.style.color = 'var(--accent)'; }
      else { msg.innerText = s; msg.style.color = 'var(--primary)'; }
    } else if (isFerias(now)) {
      msg.innerText = 'EM FÉRIAS \u2708\uFE0F'; msg.style.color = '#7030A0';
    } else {
      const trab = isTrabalhando(now, currentRegion, currentTurma);
      if (currentRegion === '1x1' && trab) {
        msg.innerText = isTurnoNoite1x1(currentTurma) ? 'TRABALHANDO (NOITE)' : 'TRABALHANDO (MANHÃ)';
      } else {
        msg.innerText = trab ? translations[currentRegion].statusTrab : translations[currentRegion].statusFolga;
      }
      msg.style.color = trab ? 'var(--accent)' : 'var(--primary)';
    }
  }
  atualizarContadorFerias();
}
function atualizarContadorFerias() {
  const el = document.getElementById('dias-ferias');
  if (!el) return;
  const range = getFeriasRange();
  if (!range.inicio || !range.fim) { el.style.display = 'none'; return; }
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const inicio = new Date(range.inicio + 'T00:00:00');
  const fim = new Date(range.fim + 'T00:00:00');
  if (hoje < inicio) {
    const dias = Math.round((inicio - hoje) / 86400000);
    el.innerText = dias === 1 ? '🏖️ Suas férias começam amanhã!' : '🏖️ Faltam ' + dias + ' dias para suas férias';
    el.style.display = 'inline-flex';
  } else if (hoje >= inicio && hoje <= fim) {
    const rest = Math.round((fim - hoje) / 86400000);
    el.innerText = rest === 0 ? '🏖️ Último dia de férias' : '🏖️ Férias em andamento · ' + rest + ' dia' + (rest > 1 ? 's' : '') + ' restante' + (rest > 1 ? 's' : '');
    el.style.display = 'inline-flex';
  } else { el.style.display = 'none'; }
}

/* ============================================================
   11) PWA
   ============================================================ */
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', function (e) {
  e.preventDefault(); deferredPrompt = e;
  const btn = document.getElementById('install-button');
  if (btn) btn.style.display = 'flex';
});
function installPWA() {
  if (deferredPrompt) { deferredPrompt.prompt(); deferredPrompt = null; const b = document.getElementById('install-button'); if (b) b.style.display = 'none'; }
}
function mostrarBannerAtualizacao() { const b = document.getElementById('update-banner'); if (b) b.classList.add('show'); }
function dispensarAtualizacao() { const b = document.getElementById('update-banner'); if (b) b.classList.remove('show'); }
function aplicarAtualizacao() {
  if (navigator.serviceWorker) { navigator.serviceWorker.getRegistration().then(function (reg) { if (reg && reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' }); }); }
  setTimeout(function () { window.location.reload(); }, 400);
}
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', function (e) { if (e.data && e.data.type === 'SW_UPDATED') mostrarBannerAtualizacao(); });
}
function mostrarBannerQuandoLivre() {
  const w = document.getElementById('welcomeScreen');
  const aberta = (w && w.style.display === 'flex' && !w.classList.contains('hide'));
  if (aberta) { setTimeout(mostrarBannerQuandoLivre, 400); return; }
  mostrarBannerAtualizacao();
}
if (getStorageValue('braun_update_pending') === 'true') {
  window.addEventListener('load', function () {
    setTimeout(function () { mostrarBannerQuandoLivre(); removeStorageValue('braun_update_pending'); }, 1500);
  });
}

/* ============================================================
   12) REGIÃO / BADGE / LEGENDA
   ============================================================ */
function atualizarBadgeTurma() {
  const tl = getStorageValue('braun_turma_perfil') || 'A';
  const bt = document.getElementById('turmaBadgeText'); if (!bt) return;
  if (tl.indexOf('1x1') === 0) {
    const turno = (tl === '1x1A' || tl === '1x1B') ? 'M' : 'N';
    const eq = (tl === '1x1A' || tl === '1x1C') ? 'A' : 'B';
    bt.innerText = '1x1 ' + turno + ' ' + eq;
  } else { bt.innerText = 'Turma ' + tl; }
}
function atualizarLegenda1x1() {
  const b = document.querySelector('.sticky-header-block'); if (!b) return;
  if (currentRegion === '1x1') b.classList.add('com-legenda'); else b.classList.remove('com-legenda');
}
function setRegion(r) {
  currentRegion = r; setStorageValue('braun_last_region', r);
  document.querySelectorAll('.tab').forEach(function (t) { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
  const at = document.getElementById('tab-' + r);
  if (at) { at.classList.add('active'); at.setAttribute('aria-selected', 'true'); }
  if (r === '1x1') { currentTurma = getStorageValue('braun_turma_1x1') || '1x1A'; setStorageValue('braun_turma_1x1', currentTurma); }
  else { currentTurma = getStorageValue('braun_turma_' + r) || (r === 'BR' ? 'AC' : 'EG'); }
  _escalaCache.clear();
  atualizarLegenda1x1();
  gerarCalendario();
  tick();
  scrollParaMes(mesAtualVisivel, anoAtualVisivel);
}

/* ============================================================
   13) BANNER DE AVISOS (com countdown de férias)
   ============================================================ */
function atualizarBannerAvisos() {
  const banner = document.getElementById('banner-avisos');
  const content = document.getElementById('bannerContent');
  const mesNav = document.getElementById('mesNav');
  if (!banner || !content || !mesNav) return;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const items = [];

  // Countdown de férias (em destaque, primeiro item)
  const range = getFeriasRange();
  if (range.inicio && range.fim) {
    const inicio = new Date(range.inicio + 'T00:00:00');
    const fim = new Date(range.fim + 'T00:00:00');
    if (hoje < inicio) {
      const dias = Math.round((inicio - hoje) / 86400000);
      if (dias === 1) items.push({ icon: 'beach_access', texto: 'Suas férias começam AMANHÃ!', destaque: true });
      else items.push({ icon: 'beach_access', texto: 'Faltam ' + dias + ' dias para suas férias', destaque: true });
    } else if (hoje >= inicio && hoje <= fim) {
      const rest = Math.round((fim - hoje) / 86400000);
      if (rest === 0) items.push({ icon: 'beach_access', texto: 'Último dia de férias', destaque: true });
      else items.push({ icon: 'beach_access', texto: 'Férias em andamento · ' + rest + ' dia' + (rest > 1 ? 's' : '') + ' restante' + (rest > 1 ? 's' : ''), destaque: true });
    }
  }

  // Notas futuras
  const logs = getJSON('logs_v26', {});
  Object.keys(logs)
    .filter(function (iso) {
      const d = new Date(iso + 'T00:00:00');
      return d >= hoje && logs[iso] && logs[iso].trim() !== '';
    })
    .sort()
    .forEach(function (iso) {
      const p = iso.split('-');
      items.push({ icon: 'event', texto: p[2] + '/' + p[1] + ' — ' + logs[iso], destaque: false });
    });

  if (items.length === 0) {
    banner.classList.remove('show');
    mesNav.classList.add('sem-banner');
    return;
  }

  let html = '';
  items.forEach(function (item) {
    const styleInner = item.destaque
      ? 'background:rgba(255,255,255,0.22);padding:4px 14px;border-radius:20px;font-weight:900;letter-spacing:0.3px;'
      : '';
    html += '<span class="banner-item">' +
            '<span class="material-symbols-outlined" style="font-variation-settings:\'FILL\' 1;">' + item.icon + '</span>' +
            '<span style="' + styleInner + '">' + escapeHtml(item.texto) + '</span>' +
            '</span>';
  });

  content.innerHTML = html;
  banner.classList.add('show');
  mesNav.classList.remove('sem-banner');
  content.style.animation = 'none';
  void content.offsetWidth;
  content.style.animation = '';
}

/* ============================================================
   14) CALENDÁRIO
   ============================================================ */
let calendarioGeracao = 0;
function proximoFeriado() {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  for (let i = 1; i <= 400; i++) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + i);
    const f = getFeriados(d.getFullYear())[String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')];
    if (f) return { data: d, nome: f, dias: i };
  }
  return null;
}
function legendaCalendario() {
  if (modoFeriados()) {
    return '<div class="mes-legenda" aria-hidden="true">' +
      '<span><i class="leg-sw hoje-sw"></i>Hoje</span>' +
      '<span><i class="leg-sw leg-fer-sw"></i>Feriado</span>' +
      '<span><i class="leg-sw leg-fds-sw"></i>Fim de semana</span>' +
      '<span><i class="leg-sw ferias-sw"></i>Férias</span>' +
      '<span><i class="leg-nota"></i>Anotação</span></div>';
  }
  const t = currentTurma; let trabCls, folgaCls, trabTxt = 'Trabalho';
  if (currentRegion === 'BR') { trabCls = t === 'AC' ? 'AMARELO' : 'VERDE'; folgaCls = t === 'AC' ? 'VERDE' : 'AMARELO'; }
  else if (currentRegion === '1x1') { const n = isTurnoNoite1x1(t); trabCls = n ? 'ROXO' : 'LARANJA'; folgaCls = 'VERDE'; trabTxt = n ? 'Trabalho (noite)' : 'Trabalho (manhã)'; }
  else { trabCls = t === 'EG' ? 'AZUL' : 'VERDE'; folgaCls = t === 'EG' ? 'VERDE' : 'AZUL'; }
  return '<div class="mes-legenda" aria-hidden="true">' +
    '<span><i class="leg-sw ' + trabCls + ' TRABALHO"></i>' + trabTxt + '</span>' +
    '<span><i class="leg-sw ' + folgaCls + '"></i>Folga</span>' +
    '<span><i class="leg-sw hoje-sw"></i>Hoje</span>' +
    '<span><i class="leg-sw ferias-sw"></i>Férias</span>' +
    '<span><b class="leg-fer">Feriado</b></span>' +
    '<span><i class="leg-nota"></i>Anotação</span></div>';
}
function gerarCalendario() {
  const box = document.getElementById('calendario-box');
  box.innerHTML = '';
  const mg = ++calendarioGeracao;
  let cm = 0; const total = 12; const ano = anoAtualVisivel;
  const leg = legendaCalendario();
  const modo = modoFeriados();
  function next() {
    if (mg !== calendarioGeracao) return;
    if (cm >= total) { setTimeout(function () { if (mg !== calendarioGeracao) return; scrollParaMes(mesAtualVisivel, anoAtualVisivel); }, 100); return; }
    const m = cm, t = currentTurma, fer = getFeriados(ano), lang = translations[currentRegion];
    const logs = getJSON('logs_v26', {});
    const hojeStr = new Date().toDateString();
    const dtM = new Date(ano, m, 1);
    const nomeM = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(dtM);
    const container = document.createElement('div');
    container.className = 'mes-container';
    container.dataset.mes = m; container.dataset.ano = ano;
    container.setAttribute('role', 'group'); container.setAttribute('aria-label', nomeM + ' de ' + ano);
    let cT = 0, cF = 0, cFer = 0, cFe = 0;
    let hF = '<div class="mes-face mes-front"><div style="display:flex;justify-content:space-between;align-items:center;margin:5px 10px 0 10px;"><span style="color:var(--primary);font-weight:800;text-transform:capitalize;font-size:1.1em;">' + nomeM + '</span><span style="color:var(--primary);font-weight:800;font-size:1.1em;">' + ano + '</span></div><div class="mes-resumo">%%RESUMO%%</div><div class="grid"><div class="dia-label">Sem</div>' + lang.days.map(function (s) { return '<div class="dia-label">' + s + '</div>'; }).join('');
    let hB = '<div class="mes-face mes-back"><div style="display:flex;justify-content:space-between;align-items:center;margin:5px 10px 0 10px;"><span style="font-weight:800;text-transform:capitalize;font-size:1.1em;">' + nomeM + '</span><span style="font-weight:800;font-size:1.1em;">' + ano + '</span></div><div style="font-weight:800;border-bottom:1px solid rgba(255,255,255,0.3);padding-bottom:5px;margin-bottom:10px;">Eventos do mês</div>';
    let hasEv = false;
    const dataRetorno = getDataRetorno();
    const retornoStr = dataRetorno ? dataRetorno.toDateString() : '';
    const dnm = new Date(ano, m + 1, 0).getDate();
    const dsi = dtM.getDay();
    const esp = dsi === 0 ? 6 : dsi - 1;
    hF += '<div class="dia-label-w">' + getWeekNumberCached(dtM) + '</div>';
    for (let i = 0; i < esp; i++) hF += '<div></div>';
    let col = esp;
    for (let d = 1; d <= dnm; d++) {
      const at = new Date(ano, m, d);
      const isoS = String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
      const isoF = ano + '-' + isoS;
      const f = fer[isoS], nt = logs[isoF];
      if (col === 7) { col = 0; hF += '<div class="dia-label-w">' + getWeekNumberCached(at) + '</div>'; }
      let cls = 'dia '; let sh = '';
      if (currentRegion === 'BR') {
        const r = checkBR(at, t);
        cls += (r.isA ? 'AMARELO ' : 'VERDE ') + (r.trab ? 'TRABALHO ' : 'FOLGA ');
        sh = r.trab ? 'trabalhando' : 'de folga';
      } else if (currentRegion === '1x1') {
        const r = check1x1(at, t); const n = isTurnoNoite1x1(t);
        if (r.trab) { cls += (n ? 'ROXO ' : 'LARANJA ') + 'TRABALHO '; sh = n ? 'trabalhando no turno da noite' : 'trabalhando no turno da manhã'; }
        else { cls += 'VERDE FOLGA '; sh = 'de folga'; }
      } else {
        const mnt = checkMnt(at, t);
        cls += (mnt.isEG ? 'AZUL ' : 'VERDE ') + (mnt.trab ? 'TRABALHO ' : 'FOLGA ');
        sh = mnt.trab ? 'trabalhando' : 'de folga';
      }
      const trabDia = cls.indexOf('TRABALHO') > -1;
      if (trabDia) cT++; else cF++;
      if (modo) { cls = 'dia NEUTRO ' + ((at.getDay() === 0 || at.getDay() === 6) ? 'FDS ' : 'UTIL '); sh = ''; }
      if (f) { cFer++; cls += 'FERIADO '; }
      if (hojeStr === at.toDateString()) cls += 'hoje ';
      if (nt) cls += 'HAS_NOTE ';
      if (isFerias(at)) { cls += 'FERIAS '; sh = 'em férias'; cFe++; }
      const isRetorno = (!modo && retornoStr && at.toDateString() === retornoStr);
      if (isRetorno) { cls += 'RETORNO '; sh = 'primeiro dia de retorno ao trabalho'; }
      if (f || nt || isRetorno) {
        hasEv = true;
        let evLine = '<div style="font-size:0.9em;margin-bottom:8px;"><b>' + d + ':</b> ';
        const partes = [];
        if (f) partes.push(f);
        if (nt) partes.push('&#128221; ' + escapeHtml(nt));
        if (isRetorno) partes.push('&#128295; Retorno ao trabalho');
        evLine += partes.join(' · ');
        evLine += '</div>';
        hB += evLine;
      }
      const al = d + ' de ' + nomeM + ' de ' + ano + (sh ? ', ' + sh : '') + (f ? ', feriado: ' + f : '') + (nt ? ', com anotação' : '') + '. Toque para ver detalhes.';
      hF += '<div class="' + cls.trim() + '" data-iso="' + isoF + '" role="button" tabindex="0" aria-label="' + escapeHtml(al) + '">' + d + '</div>';
      col++;
    }
    const chips = (modo ? '' : '<span class="mes-chip t"><b>' + cT + '</b> trabalho</span><span class="mes-chip f"><b>' + cF + '</b> folga</span>') +
      (cFer ? '<span class="mes-chip h"><b>' + cFer + '</b> feriado' + (cFer > 1 ? 's' : '') + '</span>' : (modo ? '<span class="mes-chip"><b>0</b> feriados</span>' : '')) +
      (cFe ? '<span class="mes-chip v"><b>' + cFe + '</b> férias</span>' : '') +
      (function () {
        const hj = new Date();
        if (!modo || ano !== hj.getFullYear() || m !== hj.getMonth()) return '';
        const p = proximoFeriado(); if (!p) return '';
        const dd = String(p.data.getDate()).padStart(2, '0') + '/' + String(p.data.getMonth() + 1).padStart(2, '0');
        return '<span class="mes-chip prox" title="' + escapeHtml(p.nome) + '">Próximo feriado: <b>' + dd + '</b> · ' + (p.dias === 1 ? 'amanhã' : 'em ' + p.dias + ' dias') + '</span>';
      })();
    hF = hF.replace('%%RESUMO%%', chips) + '</div>' + leg + '</div>';
    hB += (hasEv ? '' : '<div style="opacity:0.6;font-size:0.9em;">Sem registros.</div>') + '</div>';
    if (mg !== calendarioGeracao) return;
    container.innerHTML = '<div class="mes-inner">' + hF + hB + '</div>';
    box.appendChild(container);
    cm++;
    requestAnimationFrame(function () { if (mg !== calendarioGeracao) return; setTimeout(next, 0); });
  }
  next();
  atualizarTituloMes();
}
function bindCalendarioDelegation() {
  const box = document.getElementById('calendario-box');
  if (!box || box.dataset.bound === '1') return;
  box.dataset.bound = '1';
  function handleDia(el) { if (el.dataset.iso) openCard(el.dataset.iso); }
  box.addEventListener('click', function (e) {
    const dia = e.target.closest('.dia');
    if (dia) { e.stopPropagation(); handleDia(dia); return; }
    const face = e.target.closest('.mes-face');
    if (face && face.parentElement) face.parentElement.classList.toggle('flipped');
  });
  box.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const dia = e.target.closest('.dia');
    if (dia) { e.preventDefault(); handleDia(dia); return; }
    const face = e.target.closest('.mes-face');
    if (face && face.parentElement) { e.preventDefault(); face.parentElement.classList.toggle('flipped'); }
  });
}

/* ============================================================
   15) MODAIS
   ============================================================ */
function openCard(iso) {
  dataAtiva = iso;
  const logs = getJSON('logs_v26', {});
  const d = iso.split('-');
  document.getElementById('card-data').innerText = d[2] + '/' + d[1] + '/' + d[0];
  document.getElementById('noteInput').value = logs[iso] || '';
  const dtSel = new Date(d[0], d[1] - 1, d[2]);
  const yy = dtSel.getFullYear().toString().slice(-2);
  const ww = String(getWeekNumberCached(dtSel)).padStart(2, '0');
  let ds = dtSel.getDay(); ds = ds === 0 ? 7 : ds;
  document.getElementById('lote-display').innerText = yy + ww + ds;
  const sem = document.getElementById('card-dia-semana');
  if (sem) { const dn = diaDaSemanaPorExtenso(dtSel); sem.textContent = dn.charAt(0).toUpperCase() + dn.slice(1) + ' · lote sugerido e anotação deste dia.'; }
  focusModal('infoCard');
}
function copyLote() {
  const disp = document.getElementById('lote-display');
  const lote = disp.innerText, orig = lote;
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(lote).catch(function () {});
  else {
    const ta = document.createElement('textarea');
    ta.value = lote; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
  }
  disp.innerText = 'COPIADO!';
  toast('Lote copiado.', 'sucesso', 2000);
  setTimeout(function () { disp.innerText = orig; }, 1000);
}
function saveNota() {
  const log = document.getElementById('noteInput').value;
  const logs = getJSON('logs_v26', {});
  if (log.trim() === '') delete logs[dataAtiva]; else logs[dataAtiva] = log.trim();
  setStorageValue('logs_v26', JSON.stringify(logs));
  closeAllModals(); gerarCalendario(); atualizarBannerAvisos();
  toast('Anotação salva.', 'sucesso');
}
function openHamburger() {
  document.getElementById('hamburgerDrawer').classList.add('open');
  document.getElementById('drawerOverlay').classList.add('show');
  const mb = document.getElementById('menuButton'); if (mb) mb.setAttribute('aria-expanded', 'true');
  setTimeout(function () { const c = document.querySelector('#hamburgerDrawer .drawer-close-btn'); if (c) c.focus(); }, 100);
}
function closeHamburger() {
  document.getElementById('hamburgerDrawer').classList.remove('open');
  document.getElementById('drawerOverlay').classList.remove('show');
  const mb = document.getElementById('menuButton'); if (mb) mb.setAttribute('aria-expanded', 'false'); if (mb) mb.focus();
}
function openRamais() { focusModal('ramaisCard'); }
function normalizarBusca(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
function prepararRamais() {
  const card = document.getElementById('ramaisCard'); if (!card) return;
  const secoes = card.querySelectorAll('.ramal-secao');
  function contar() {
    secoes.forEach(function (sec) {
      let n = 0, el = sec.nextElementSibling;
      while (el && !el.classList.contains('ramal-secao')) {
        if (el.classList.contains('ramal-item') && el.style.display !== 'none') n++;
        el = el.nextElementSibling;
      }
      const q = sec.querySelector('.ramal-qtd'); if (q) q.textContent = n;
      sec.style.display = n ? '' : 'none';
    });
  }
  const inp = document.getElementById('ramaisBusca');
  if (inp) inp.addEventListener('input', function () {
    const t = normalizarBusca(inp.value.trim());
    let total = 0;
    card.querySelectorAll('.ramal-item').forEach(function (it) {
      const ok = !t || normalizarBusca(it.textContent).indexOf(t) > -1;
      it.style.display = ok ? '' : 'none'; if (ok) total++;
    });
    contar();
    const v = document.getElementById('ramaisVazio'); if (v) v.classList.toggle('ct-oculto', total > 0);
  });
  contar();
}
function openPrivacy() { focusModal('privacyCard'); }
function openMeuPerfil() {
  closeHamburger();
  document.getElementById('nomePerfil').value = getStorageValue('braun_nome_completo') || '';
  document.getElementById('matriculaPerfil').value = getStorageValue('braun_matricula') || '';
  document.getElementById('turmaPerfil').value = getStorageValue('braun_turma_perfil') || 'A';
  document.getElementById('anoPerfil').value = getStorageValue('braun_ano') || '2026';
  document.getElementById('setorPerfil').value = getStorageValue('braun_setor') || '';
  focusModal('meuPerfilCard');
}
function openColaboradorDoMes() {
  closeHamburger();
  preencherDadosModais();
  const vn = document.getElementById('votoNome');
  if (vn) vn.value = '';
  const bloco = document.getElementById('votoFormBloco');
  const agrad = document.getElementById('votoAgradecimento');
  if (bloco) bloco.style.display = 'block';
  if (agrad) agrad.style.display = 'none';
  focusModal('colaboradorDoMesCard');
}
function openMeusPedidos() { closeHamburger(); preencherDadosModais(); limparPedido(); focusModal('meusPedidosCard'); }
function openConfig() {
  const tgMin = document.getElementById('minimalGreetingToggle');
  const tgVoz = document.getElementById('voiceResponseToggle');
  if (tgMin) tgMin.checked = getStorageValue('braun_minimal_greeting') === 'true';
  if (tgVoz) tgVoz.checked = getStorageValue('braun_voice_response') !== 'false';
  atualizarUIVoz();
  focusModal('configCard');
}
function openFerias() {
  document.getElementById('feriasInicio').value = getStorageValue('braun_ferias_inicio') || '';
  document.getElementById('feriasFim').value = getStorageValue('braun_ferias_fim') || '';
  document.getElementById('feriasDuracao').value = '30';
  document.getElementById('sugestoesFerias').innerHTML = '';
  popularMesesFerias();
  document.getElementById('configCard').classList.remove('show');
  focusModal('feriasCard');
}
function openStats() {
  const ano = parseInt(currentAno), turma = currentTurma;
  const lead = document.getElementById('statsLead');
  if (lead && modoFeriados()) lead.textContent = 'Feriados de ' + ano;
  else if (lead) { const tf = formatarTurmaParaVoz(turma); lead.textContent = 'Ano ' + ano + ' · ' + (currentRegion === '1x1' ? 'Escala ' + tf : nomeRegiao(currentRegion) + ' · Turmas ' + tf); }
  const modoF = modoFeriados();
  const ck = ano + '_' + turma + '_' + currentRegion + (modoF ? '_f' : '');
  if (cachedStats[ck]) { document.getElementById('stats-content').innerHTML = cachedStats[ck]; document.getElementById('configCard').classList.remove('show'); focusModal('statsCard'); return; }
  const feriados = getFeriados(ano);
  let dt = 0, df = 0, ft = 0, ff = 0; const lista = [];
  for (let m = 0; m < 12; m++) {
    for (let d = 1; d <= new Date(ano, m + 1, 0).getDate(); d++) {
      const dTeste = new Date(ano, m, d);
      const isoS = String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
      const res = isTrabalhando(dTeste, currentRegion, turma);
      if (res) dt++; else df++;
      if (feriados[isoS]) {
        if (res) ft++; else ff++;
        lista.push({ data: String(d).padStart(2, '0') + '/' + String(m + 1).padStart(2, '0'), nome: feriados[isoS], trab: res, dow: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][dTeste.getDay()], dt: dTeste });
      }
    }
  }
  const pct = Math.round((dt / (dt + df)) * 100);
  const htmlNormal =
    '<div class="ct-stats dois"><div class="ct-stat roxo"><b>' + dt + '</b><span>Dias trabalhados</span></div><div class="ct-stat verde"><b>' + df + '</b><span>Dias de folga</span></div></div>' +
    '<div class="ct-barra" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '" aria-label="Proporção de dias trabalhados"><i style="width:' + pct + '%;background:var(--accent)"></i></div>' +
    '<div class="stat-legenda">' + pct + '% do ano trabalhando · ' + (100 - pct) + '% de folga</div>' +
    '<div class="pg-secao ic"><span class="pg-ico sm"><span class="material-symbols-outlined" aria-hidden="true">event</span></span><span>Feriados</span></div>' +
    '<div class="ct-stats dois"><div class="ct-stat roxo"><b>' + ft + '</b><span>Trabalhados</span></div><div class="ct-stat verde"><b>' + ff + '</b><span>De folga</span></div></div>' +
    (lista.length ? '<div class="pg-card stat-feriados">' + lista.map(function (f) {
      return '<div class="stat-fer"><span class="stat-fer-data">' + f.data + '</span><span class="stat-fer-nome">' + f.nome + '</span><span class="chip ' + (f.trab ? 'roxo' : 'verde') + '">' + (f.trab ? 'Trabalha' : 'Folga') + '</span></div>';
    }).join('') + '</div>' : '');
  const hojeS = new Date(); hojeS.setHours(0, 0, 0, 0);
  const prox = lista.filter(function (f) { return f.dt >= hojeS; })[0];
  const htmlFer =
    '<div class="ct-stats dois"><div class="ct-stat roxo"><b>' + lista.length + '</b><span>Feriados no ano</span></div><div class="ct-stat verde"><b>' + (prox ? prox.data : '—') + '</b><span>Próximo feriado</span></div></div>' +
    '<div class="pg-secao ic"><span class="pg-ico sm"><span class="material-symbols-outlined" aria-hidden="true">event</span></span><span>Feriados de ' + ano + '</span></div>' +
    (lista.length ? '<div class="pg-card stat-feriados">' + lista.map(function (f) {
      return '<div class="stat-fer"><span class="stat-fer-data">' + f.data + '</span><span class="stat-fer-nome">' + f.nome + '</span><span class="chip roxo">' + f.dow + '</span></div>';
    }).join('') + '</div>' : '');
  const html = modoF ? htmlFer : htmlNormal;
  cachedStats[ck] = html;
  document.getElementById('stats-content').innerHTML = html;
  document.getElementById('configCard').classList.remove('show');
  focusModal('statsCard');
}

/* ============================================================
   16) PERFIL / PEDIDOS / VOTAÇÃO
   ============================================================ */
function salvarDadosPerfil() {
  const nome = document.getElementById('nomePerfil').value;
  const matr = document.getElementById('matriculaPerfil').value;
  const turma = document.getElementById('turmaPerfil').value;
  const ano = document.getElementById('anoPerfil').value;
  const setor = document.getElementById('setorPerfil').value;
  setStorageValue('braun_nome_completo', nome);
  setStorageValue('braun_matricula', matr);
  setStorageValue('braun_turma_perfil', turma);
  setStorageValue('braun_ano', ano);
  setStorageValue('braun_setor', setor);
  let region, grupo;
  if (['A','B','C','D'].indexOf(turma) > -1) { region = 'BR'; grupo = (turma === 'A' || turma === 'C') ? 'AC' : 'BD'; }
  else if (turma.indexOf('1x1') === 0) { region = '1x1'; grupo = turma; }
  else { region = 'MNT'; grupo = (turma === 'E' || turma === 'G') ? 'EG' : 'FH'; }
  currentRegion = region; currentTurma = grupo;
  setStorageValue('braun_last_region', region);
  setStorageValue('braun_turma_' + region, grupo);
  currentAno = parseInt(ano) || 2026;
  anoAtualVisivel = currentAno;
  mesAtualVisivel = new Date().getMonth();
  _escalaCache.clear();
  atualizarLegenda1x1();
  gerarCalendario();
  tick();
  atualizarBannerAvisos();
  atualizarBadgeTurma();
  preencherDadosModais();
}
function preencherDadosModais() {
  const nome = getStorageValue('braun_nome_completo') || '---';
  const matr = getStorageValue('braun_matricula') || '---';
  const turma = getStorageValue('braun_turma_perfil') || '---';
  const ano = getStorageValue('braun_ano') || '---';
  const vt = document.getElementById('votacaoTurma');
  const vm = document.getElementById('votacaoMatricula');
  const pn = document.getElementById('pedidoNome');
  const pm = document.getElementById('pedidoMatricula');
  const pt = document.getElementById('pedidoTurma');
  const pa = document.getElementById('pedidoAno');
  if (vt) vt.innerText = turma;
  if (vm) vm.innerText = matr;
  if (pn) pn.innerText = nome;
  if (pm) pm.innerText = matr;
  if (pt) pt.innerText = turma;
  if (pa) pa.innerText = ano;
}
function abrirFormularioVotacao() {
  const turma = getStorageValue('braun_turma_perfil') || '';
  const matricula = getStorageValue('braun_matricula') || '';
  const votoInput = document.getElementById('votoNome');
  const voto = votoInput ? votoInput.value.trim() : '';

  if (!turma) { toast('Preencha sua turma no Perfil primeiro.', 'aviso'); return; }
  if (!matricula) { toast('Preencha sua matrícula no Perfil primeiro.', 'aviso'); return; }
  if (!voto) { toast('Digite o nome do colaborador que você quer votar.', 'aviso'); return; }

  const url = 'https://docs.google.com/forms/d/e/1FAIpQLSdoP_K57HRUXTrnMX23k2cB2h0m8UBwxiGihBoORWCrdE_x3Q/viewform?usp=pp_url' +
    '&entry.1097002360=' + encodeURIComponent(turma) +
    '&entry.2099346238=' + encodeURIComponent(matricula) +
    '&entry.1005686647=' + encodeURIComponent(voto);

  window.open(url, '_blank');

  const bloco = document.getElementById('votoFormBloco');
  const agrad = document.getElementById('votoAgradecimento');
  if (bloco) bloco.style.display = 'none';
  if (agrad) agrad.style.display = 'block';

  toast('Formulário aberto em outra aba!', 'sucesso', 4000);
}
function voltarAoVoto() {
  const bloco = document.getElementById('votoFormBloco');
  const agrad = document.getElementById('votoAgradecimento');
  const vn = document.getElementById('votoNome');
  if (bloco) bloco.style.display = 'block';
  if (agrad) agrad.style.display = 'none';
  if (vn) vn.value = '';
  setTimeout(function () { if (vn) vn.focus(); }, 100);
}
function limparPedido() {
  const card = document.getElementById('meusPedidosCard'); if (!card) return;
  card.querySelectorAll('.pedido-qtd, .pedido-tam, .pedido-nome-livre').forEach(function (i) { i.value = ''; });
  const obs = document.getElementById('pedidoObs'); if (obs) obs.value = '';
}
function enviarPedidoEmail() {
  const nome = getStorageValue('braun_nome_completo') || '';
  const matr = getStorageValue('braun_matricula') || '';
  const turma = getStorageValue('braun_turma_perfil') || '';
  const ano = getStorageValue('braun_ano') || '';
  const setor = getStorageValue('braun_setor') || '';
  const obs = document.getElementById('pedidoObs').value.trim();
  const L1 = [], L2 = [], L3 = [];
  document.querySelectorAll('#meusPedidosCard .pedido-item-row').forEach(function (row) {
    const li = row.querySelector('.pedido-nome-livre');
    const ni = li ? li.value.trim() : (row.dataset.item || '');
    if (!ni) return;
    const qi = row.querySelector('.pedido-qtd'), ti = row.querySelector('.pedido-tam');
    const q = qi ? qi.value.trim() : '', t = ti ? ti.value.trim() : '';
    if (!q || q === '0') return;
    let l = '• ' + ni + ': ' + q + ' un.';
    if (t) l += ' — Tamanho: ' + t;
    if (row.dataset.secao === 'uniformes') L1.push(l);
    else if (row.dataset.secao === 'epis') L2.push(l);
    else L3.push(l);
  });
  if (!L1.length && !L2.length && !L3.length) { toast('Preencha a quantidade de pelo menos um item.', 'aviso'); return; }
  let c = 'Nome: ' + nome + '\nMatrícula: ' + matr + '\nTurma: ' + turma + '\n';
  if (setor) c += 'Setor: ' + setor + '\n';
  c += 'Ano: ' + ano + '\n\nITENS SOLICITADOS\n=================\n\n';
  if (L1.length) c += 'UNIFORMES:\n' + L1.join('\n') + '\n\n';
  if (L2.length) c += 'EQUIPAMENTOS DE PROTEÇÃO (EPIs):\n' + L2.join('\n') + '\n\n';
  if (L3.length) c += 'OUTROS ITENS:\n' + L3.join('\n') + '\n\n';
  if (obs) c += 'OBSERVAÇÕES:\n' + obs + '\n';
  const a = 'Pedido de Materiais - ' + (nome || 'Colaborador') + (matr ? ' (' + matr + ')' : '');
  window.location.href = 'mailto:' + EMAILS_PEDIDOS.join(',') + '?subject=' + encodeURIComponent(a) + '&body=' + encodeURIComponent(c);
  toast('Abrindo seu e-mail...', 'info');
}

/* ============================================================
   17) FÉRIAS
   ============================================================ */
function saveFerias() {
  const ini = document.getElementById('feriasInicio').value;
  const fim = document.getElementById('feriasFim').value;
  if (!ini || !fim) { toast('Preencha as duas datas.', 'aviso'); return; }
  if (ini > fim) { toast('A data de início não pode ser após o término.', 'erro'); return; }
  setStorageValue('braun_ferias_inicio', ini);
  setStorageValue('braun_ferias_fim', fim);
  clearFeriasCache();
  closeAllModals(); gerarCalendario(); tick(); atualizarBannerAvisos();
  toast('Férias programadas.', 'sucesso');
}
function confirmarClearFerias() {
  toastConfirm('Deseja limpar o período de férias?', function (ok) {
    if (!ok) return;
    removeStorageValue('braun_ferias_inicio'); removeStorageValue('braun_ferias_fim');
    clearFeriasCache();
    closeAllModals(); gerarCalendario(); tick(); atualizarBannerAvisos();
    toast('Férias removidas.', 'info');
  });
}

/* ---------- SUGESTÃO INTELIGENTE DE FÉRIAS ---------- */
function popularMesesFerias() {
  const sel = document.getElementById('feriasMes'); if (!sel) return;
  sel.innerHTML = '';
  const nomes = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const hoje = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
    const opt = document.createElement('option');
    opt.value = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    opt.innerText = nomes[d.getMonth()] + ' ' + d.getFullYear();
    sel.appendChild(opt);
  }
}
function calcularDiasEmCasaFerias(S, E) {
  let X = new Date(S.getTime());
  for (let i = 0; i < 10; i++) {
    const prev = new Date(X.getTime()); prev.setDate(prev.getDate() - 1);
    if (!isTrabalhando(prev, currentRegion, currentTurma)) X = prev; else break;
  }
  let Y = new Date(E.getTime());
  for (let i = 0; i < 10; i++) {
    const nx = new Date(Y.getTime()); nx.setDate(nx.getDate() + 1);
    if (!isTrabalhando(nx, currentRegion, currentTurma)) Y = nx; else break;
  }
  return Math.round((Y.getTime() - X.getTime()) / 86400000) + 1;
}
function sugerirFerias() {
  const mesStr = document.getElementById('feriasMes').value;
  const duracao = parseInt(document.getElementById('feriasDuracao').value) || 30;
  if (duracao < 5 || duracao > 60) { toast('Escolha entre 5 e 60 dias.', 'aviso'); return; }
  if (!mesStr) { toast('Escolha um mês.', 'aviso'); return; }
  const partes = mesStr.split('-');
  const ano = parseInt(partes[0]), mes = parseInt(partes[1]) - 1;
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const dnm = new Date(ano, mes + 1, 0).getDate();
  const cands = [];
  for (let d = 1; d <= dnm; d++) {
    const S = new Date(ano, mes, d);
    if (S <= hoje) continue;
    const E = new Date(S.getTime()); E.setDate(E.getDate() + duracao - 1);
    const hd = calcularDiasEmCasaFerias(S, E);
    cands.push({ S: S, E: E, homeDays: hd, ganho: hd - duracao });
  }
  if (!cands.length) { toast('Nenhuma data disponível nesse mês.', 'aviso'); return; }
  cands.sort(function (a, b) { if (b.homeDays !== a.homeDays) return b.homeDays - a.homeDays; return a.S.getTime() - b.S.getTime(); });
  const top = [];
  for (let i = 0; i < cands.length && top.length < 5; i++) {
    const c = cands[i];
    if (!top.some(function (t) { return Math.abs(t.S.getTime() - c.S.getTime()) < 3 * 86400000; })) top.push(c);
  }
  renderSugestoesFerias(top, duracao);
}
function rolarParaSugestoes() {
  const modal = document.getElementById('feriasCard'), alvo = document.getElementById('sugestoesFerias');
  if (!modal || !alvo) return;
  const ativo = document.activeElement;
  if (ativo && ativo !== document.body && ativo.blur) ativo.blur();   // fecha o teclado do campo de dias
  const posicionar = function (suave) {
    const barra = modal.querySelector('.modal-bar');
    const desejado = modal.getBoundingClientRect().top + (barra ? barra.offsetHeight : 60) + 12;
    const delta = alvo.getBoundingClientRect().top - desejado;
    if (Math.abs(delta) < 4) return;
    if (suave && modal.scrollTo) modal.scrollTo({ top: Math.max(0, modal.scrollTop + delta), behavior: 'smooth' });
    else modal.scrollTop = Math.max(0, modal.scrollTop + delta);
  };
  posicionar(true);
  // o teclado e o layout podem mudar logo após o toque: confere de novo e corrige sem animação
  setTimeout(function () { posicionar(false); }, 300);
  setTimeout(function () { posicionar(false); }, 700);
}
function renderSugestoesFerias(sug, duracao) {
  const container = document.getElementById('sugestoesFerias');
  if (!sug.length) {
    container.innerHTML = '<p style="font-size:0.85em;opacity:0.6;text-align:center;">Sem sugestões para esse mês.</p>';
    rolarParaSugestoes();
    return;
  }
  const nomeDia = ['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'];
  let html = '<p class="pg-lead" style="margin:4px 0 12px;font-size:0.88rem;">Toque numa opção para preencher as datas:</p>';
  sug.forEach(function (s, i) {
    const iniF = s.S.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
    const fimF = s.E.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
    let retorno = new Date(s.E.getTime());
    for (let j = 0; j < 15; j++) {
      retorno.setDate(retorno.getDate() + 1);
      if (isTrabalhando(retorno, currentRegion, currentTurma)) break;
    }
    const retornoF = retorno.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
    const retornoDia = nomeDia[retorno.getDay()];
    const chip = s.ganho > 0 ? '<span class="sug-chip ganho">+' + s.ganho + ' dia' + (s.ganho > 1 ? 's' : '') + '</span>' : '<span class="sug-chip neutro">sem ganho</span>';
    const melhor = i === 0 ? '<span class="sug-melhor"><span class="material-symbols-outlined" aria-hidden="true">star</span>Melhor opção</span>' : '';
    html += '<div data-sugestao-ini="' + s.S.toISOString().split('T')[0] + '" data-sugestao-fim="' + s.E.toISOString().split('T')[0] + '" class="sugestao-ferias-item' + (i === 0 ? ' destaque' : '') + '" role="button" tabindex="0">' + melhor +
      '<div class="sug-topo"><div class="sug-datas">' + iniF + ' → ' + fimF + '</div>' + chip + '</div>' +
      '<div class="sug-info">Você ficará <strong>' + s.homeDays + ' dias em casa</strong> consecutivos.</div>' +
      '<div class="sug-retorno"><span class="material-symbols-outlined" aria-hidden="true">work</span>Retorno: <strong>' + retornoF + '</strong> (' + retornoDia + ')</div>' +
      '</div>';
  });
  container.innerHTML = html;
  container.querySelectorAll('.sugestao-ferias-item').forEach(function (el) {
    const aplicar = function () {
      document.getElementById('feriasInicio').value = el.dataset.sugestaoIni;
      document.getElementById('feriasFim').value = el.dataset.sugestaoFim;
      toast('Datas preenchidas! Toque em Salvar período.', 'sucesso', 2500);
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    el.addEventListener('click', aplicar);
    el.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); aplicar(); } });
  });
  rolarParaSugestoes();
}

/* ============================================================
   18) DARK MODE + NAV
   ============================================================ */
function atualizarThemeColor() {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) return;
  meta.setAttribute('content', document.documentElement.classList.contains('dark-mode') ? '#121212' : '#00A97A');
}
function toggleDarkMode() { document.documentElement.classList.toggle('dark-mode'); setStorageValue('braun_dark_mode', document.documentElement.classList.contains('dark-mode')); atualizarThemeColor(); }
function toggleMinimalGreeting() { setStorageValue('braun_minimal_greeting', document.getElementById('minimalGreetingToggle').checked ? 'true' : 'false'); aplicarModoFeriados(); gerarCalendario(); tick(); }
function toggleVoiceResponse() { setStorageValue('braun_voice_response', document.getElementById('voiceResponseToggle').checked ? 'true' : 'false'); }
function atualizarTituloMes() {
  const dt = new Date(anoAtualVisivel, mesAtualVisivel, 1);
  const nome = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(dt);
  const el = document.getElementById('mesNavTitle');
  if (el) el.innerText = nome.charAt(0).toUpperCase() + nome.slice(1);
}
function mudarMes(d) {
  mesAtualVisivel += d;
  if (mesAtualVisivel > 11) { mesAtualVisivel = 0; anoAtualVisivel++; }
  else if (mesAtualVisivel < 0) { mesAtualVisivel = 11; anoAtualVisivel--; }
  if (anoAtualVisivel < 2026) { anoAtualVisivel = 2026; mesAtualVisivel = 0; }
  if (anoAtualVisivel > 2027) { anoAtualVisivel = 2027; mesAtualVisivel = 11; }
  if (anoAtualVisivel !== parseInt(currentAno)) {
    currentAno = anoAtualVisivel; setStorageValue('braun_ano', String(currentAno));
    _escalaCache.clear(); gerarCalendario();
    setTimeout(function () { scrollParaMes(mesAtualVisivel, anoAtualVisivel); }, 150);
  } else { scrollParaMes(mesAtualVisivel, anoAtualVisivel); }
  atualizarTituloMes();
}
function irParaHoje() {
  const h = new Date(); mesAtualVisivel = h.getMonth(); anoAtualVisivel = h.getFullYear();
  if (anoAtualVisivel < 2026 || anoAtualVisivel > 2027) { anoAtualVisivel = 2026; mesAtualVisivel = 0; }
  if (anoAtualVisivel !== parseInt(currentAno)) {
    currentAno = anoAtualVisivel; setStorageValue('braun_ano', String(currentAno));
    _escalaCache.clear(); gerarCalendario();
    setTimeout(function () { scrollParaMes(mesAtualVisivel, anoAtualVisivel); }, 150);
  } else { scrollParaMes(mesAtualVisivel, anoAtualVisivel); }
  atualizarTituloMes();
}
function atualizarOffsetCalendario() {
  const sb = document.querySelector('.sticky-header-block'); if (!sb) return;
  const top = parseFloat(getComputedStyle(sb).top) || 0;
  document.documentElement.style.setProperty('--cal-offset', Math.round(top + sb.offsetHeight + 25) + 'px');
}
function scrollParaMes(mes, ano) {
  let c = document.querySelector('.mes-container[data-mes="' + mes + '"][data-ano="' + ano + '"]');
  if (!c) {
    currentAno = ano; setStorageValue('braun_ano', String(currentAno));
    _escalaCache.clear(); gerarCalendario();
    setTimeout(function () {
      c = document.querySelector('.mes-container[data-mes="' + mes + '"][data-ano="' + ano + '"]');
      if (c) {
        atualizarOffsetCalendario();
        c.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 200); return;
  }
  atualizarOffsetCalendario();
  c.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function scrollToToday() {
  const h = new Date(); mesAtualVisivel = h.getMonth(); anoAtualVisivel = h.getFullYear();
  if (anoAtualVisivel < 2026 || anoAtualVisivel > 2027) { anoAtualVisivel = 2026; mesAtualVisivel = 0; }
  if (anoAtualVisivel !== parseInt(currentAno)) {
    currentAno = anoAtualVisivel; setStorageValue('braun_ano', String(currentAno));
    _escalaCache.clear(); gerarCalendario();
    setTimeout(function () { scrollParaMes(mesAtualVisivel, anoAtualVisivel); }, 200);
  } else { scrollParaMes(mesAtualVisivel, anoAtualVisivel); }
  atualizarTituloMes();
}
var welcomeTimer = null;
var welcomeMostrado = false;
var welcomeIniciarTimer = null;
function goToGreeting() {
  const w = document.getElementById('welcomeScreen');
  if (!w || w.classList.contains('hide')) return;
  if (welcomeTimer) { clearTimeout(welcomeTimer); welcomeTimer = null; }
  w.classList.add('hide');
  setTimeout(function () { w.style.display = 'none'; document.documentElement.classList.remove('welcome-on'); setStorageValue('braun_visited', 'true'); atualizarThemeColor(); scrollToToday(); }, 600);
}
function boasVindas() {
  const w = document.getElementById('welcomeScreen');
  if (!w) return;
  const nomeCompleto = (getStorageValue('braun_nome_completo') || '').trim();
  const temNome = nomeCompleto.length > 0;
  const visitado = getStorageValue('braun_visited');
  if (!temNome && visitado) { document.documentElement.classList.remove('welcome-on'); return; }
  if (welcomeMostrado) return;
  welcomeMostrado = true;

  const h = new Date().getHours();
  const saud = (h >= 5 && h < 12) ? 'Bom dia' : (h >= 12 && h < 18) ? 'Boa tarde' : 'Boa noite';
  const ey = document.getElementById('wEyebrow'), nm = document.getElementById('wName'), sb = document.getElementById('wSub');
  if (ey) ey.textContent = saud;
  if (temNome) {
    const p = nomeCompleto.split(/\s+/)[0];
    const nome = p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
    if (nm) nm.textContent = nome;
    if (sb) sb.textContent = 'Bem-vindo ao Braun OnLine';
    w.setAttribute('aria-label', saud + ', ' + nome + '. Bem-vindo ao Braun OnLine. Toque para continuar');
  } else {
    if (nm) nm.textContent = 'Bem-vindo';
    if (sb) sb.textContent = 'Empowering Global Health Workforce';
  }
  const slot = w.querySelector('.w-logo');
  const src = document.querySelector('header .brand-logo-svg');
  if (slot && src && !slot.firstChild) {
    const c = src.cloneNode(true);
    ['class', 'role', 'aria-label'].forEach(function (a) { c.removeAttribute(a); });
    const t = c.querySelector('title'); if (t) t.remove();
    c.setAttribute('aria-hidden', 'true');
    slot.appendChild(c);
  }
  // Barra de status acompanha o verde da tela de boas-vindas
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', '#00A97A');
  w.style.display = 'flex';
  if (temNome) {
    w.classList.add('auto');
    welcomeIniciarTimer = function () {
      welcomeIniciarTimer = null;
      if (welcomeTimer) return;
      welcomeTimer = setTimeout(goToGreeting, 3600);
    };
    welcomeIniciarTimer();
  }
}

/* ============================================================
   19) BACKUP / ICS
   ============================================================ */
function exportarBackup() {
  try {
    const data = { schema: SCHEMA_VERSION, app: 'BraunOnLine', versao: window.APP_VERSION, exportado_em: new Date().toISOString(), dados: {} };
    BACKUP_KEYS.forEach(function (k) { const v = getStorageValue(k); if (v !== null) data.dados[k] = v; });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'braun-backup-' + new Date().toISOString().split('T')[0] + '.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    toast('Backup exportado com sucesso.', 'sucesso');
  } catch (e) { console.error(e); toast('Falha ao exportar backup.', 'erro'); }
}
function importarBackup() { document.getElementById('backupFileInput').click(); }
function handleBackupFile(ev) {
  const file = ev.target.files && ev.target.files[0]; if (!file) return;
  const r = new FileReader();
  r.onload = function (e) {
    try {
      const j = JSON.parse(e.target.result);
      if (!j || typeof j !== 'object' || !j.dados) throw new Error('Formato inválido.');
      if ((j.schema || 0) > SCHEMA_VERSION) { toast('Backup de versão mais nova.', 'erro', 5000); return; }
      toastConfirm('Isso substituirá seus dados atuais. Continuar?', function (ok) {
        if (!ok) return;
        Object.keys(j.dados).forEach(function (k) { setStorageValue(k, j.dados[k]); });
        toast('Backup restaurado. Recarregando...', 'sucesso');
        setTimeout(function () { window.location.reload(); }, 900);
      });
    } catch (err) { console.error(err); toast('Arquivo de backup inválido.', 'erro'); }
  };
  r.readAsText(file); ev.target.value = '';
}
function exportarEscalaICS() {
  const ano = parseInt(currentAno), turma = currentTurma, region = currentRegion;
  const nomeTurma = getStorageValue('braun_turma_perfil') || turma;
  const ics = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Braun OnLine//Escala//PT','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:Escala Braun - ' + nomeTurma,'X-WR-TIMEZONE:America/Sao_Paulo'];
  for (let m = 0; m < 12; m++) {
    for (let d = 1; d <= new Date(ano, m + 1, 0).getDate(); d++) {
      const data = new Date(ano, m, d);
      const trab = isTrabalhando(data, region, turma);
      const fer = isFerias(data);
      if (!trab && !fer) continue;
      const yyyy = data.getFullYear(), mm = String(data.getMonth() + 1).padStart(2, '0'), dd = String(data.getDate()).padStart(2, '0');
      const dStr = '' + yyyy + mm + dd;
      const ed = new Date(data); ed.setDate(ed.getDate() + 1);
      const eStr = '' + ed.getFullYear() + String(ed.getMonth() + 1).padStart(2, '0') + String(ed.getDate()).padStart(2, '0');
      ics.push('BEGIN:VEVENT');
      ics.push('UID:' + dStr + '-braun-' + turma + '@braunonline');
      ics.push('DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z');
      ics.push('DTSTART;VALUE=DATE:' + dStr);
      ics.push('DTEND;VALUE=DATE:' + eStr);
      ics.push('SUMMARY:' + (fer ? 'FERIAS' : 'TRABALHO'));
      ics.push('DESCRIPTION:' + (fer ? 'Periodo de ferias' : 'Dia de trabalho - ' + nomeTurma));
      ics.push('END:VEVENT');
    }
  }
  ics.push('END:VCALENDAR');
  const blob = new Blob([ics.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'Escala_Braun_' + nomeTurma + '_' + ano + '.ics';
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  toast('Arquivo .ics gerado!', 'sucesso', 4500);
}

/* ============================================================
   20) CARTILHAS
   ============================================================ */
const cartilhasData = [
  { id:'comousar', icone:'help', titulo:'Como usar o Braun OnLine', conteudo:'<p>Bem-vindo ao <strong>Braun OnLine</strong>! Este guia mostra, em poucos minutos, como aproveitar cada recurso do app.</p><h4>Sua escala</h4><div class="cartilha-destaque"><strong>📅 Calendário</strong><br>Os dias coloridos mostram a sua escala. Use as abas do rodapé para alternar entre <b>ECOFLAC</b>, <b>MANUT.</b> e <b>1x1</b>, e a aba <b>BUSCAR</b> para consultar qualquer data.</div><div class="cartilha-destaque"><strong>✏️ Anotações</strong><br>Toque em qualquer dia para escrever um lembrete.</div><h4>Ferramentas do dia a dia</h4><ul><li><b>Programar férias:</b> a ferramenta de Sugestão mostra as datas que rendem mais dias em casa.</li><li><b>Meus Pedidos:</b> preencha quantidade e tamanho e envie por e-mail (menu ☰ → Meus Pedidos).</li><li><b>Ramais Úteis:</b> contatos internos e o ramal de emergência.</li><li><b>Estatísticas:</b> dias trabalhados e folgas na sua escala.</li></ul><h4>Tudo no menu ☰</h4><p>O menu reúne todas as telas do app: Perfil, Ramais, Colaborador do Mês, Pedidos, Férias, Cartilhas, Conquistas, Novidades, Pesquisar Escala, Estatísticas e Configurações. Em cada tela, o botão <b>Voltar</b>, no canto superior esquerdo, leva de volta ao app.</p><h4>Seus dados</h4><div class="ct-alerta"><strong>💾 Backup:</strong> menu ☰ → Configurações → Exportar Backup (JSON). Guarde o arquivo para recuperar seus dados se trocar de aparelho.<br><br><strong>🔔 Atualizações:</strong> sempre que aparecer um aviso verde no topo da tela, toque em <b>Atualizar</b>.</div>', quiz:[{pergunta:'Como você faz backup?',opcoes:['Tocando no calendário','Menu ☰ → Configurações → Exportar Backup','Reiniciando','Falando com supervisor'],certa:1},{pergunta:'Onde programa férias?',opcoes:['Nas Cartilhas','No Meu Perfil','No menu ☰ → Programar Férias','Não dá'],certa:2},{pergunta:'O que fazer quando aparecer o aviso verde de nova versão no topo?',opcoes:['Ignorar','Tocar em Atualizar','Desinstalar','Reiniciar'],certa:1},{pergunta:'Quais abas do rodapé alternam a escala?',opcoes:['Perfil, Pedidos e Férias','ECOFLAC, MANUT. e 1x1','Kaizen, 5S e PDCA','Hoje, Mês e Ano'],certa:1},{pergunta:'Como criar um lembrete em um dia?',opcoes:['Pelo menu Privacidade','Tocando no dia e escrevendo a anotação','Exportando o backup','Não é possível'],certa:1},{pergunta:'Para que serve a Sugestão de férias?',opcoes:['Calcular salário','Descobrir datas que rendem mais dias em casa','Trocar de turma','Enviar pedidos'],certa:1},{pergunta:'Como enviar um pedido de uniforme ou EPI?',opcoes:['Ligando para o RH','Preenchendo quantidade e tamanho e enviando por e-mail','Pelo QR Code','Não é possível'],certa:1},{pergunta:'Qual botão leva de volta ao app a partir de qualquer tela?',opcoes:['Hoje','Atualizar','Voltar, no canto superior esquerdo','Buscar'],certa:2},{pergunta:'Como consultar a escala de uma data qualquer?',opcoes:['Pela aba BUSCAR do rodapé','Pedindo ao RH','Apagando o calendário','Não é possível'],certa:0},{pergunta:'Onde ficam o Colaborador do Mês e as Conquistas?',opcoes:['Só no rodapé','No menu ☰','Dentro do Backup','Não existem no app'],certa:1},{pergunta:'Por que exportar o backup?',opcoes:['Para trocar de turma','Para liberar a bateria','Para acelerar o app','Para recuperar seus dados se trocar de aparelho'],certa:3}] },
  { id:'kaizen', icone:'trending_up', titulo:'Kaizen – Melhoria Contínua', conteudo:'<p><strong>Kaizen</strong> significa “mudança para melhor”. É a prática de melhorar um pouco a cada dia, com a participação de todos, da operação à liderança.</p><h4>Princípios</h4><div class="cartilha-destaque"> • Eliminar desperdícios<br> • Padronizar processos<br> • Envolver todos<br> • Focar em dados</div><h4>Os 7 desperdícios</h4><ul><li>Superprodução</li><li>Espera</li><li>Transporte desnecessário</li><li>Processamento excessivo</li><li>Estoque excessivo</li><li>Movimentação desnecessária</li><li>Defeitos e retrabalho</li></ul><h4>No dia a dia</h4><div class="cartilha-exemplo"><b>Gemba:</b> vá até onde o trabalho acontece, observe e converse com quem executa a tarefa.<br><br><b>Exemplo:</b> reorganizar a bancada para reduzir a movimentação já é um Kaizen.</div><div class="ct-alerta">Toda ideia conta: uma melhoria pequena, repetida por muita gente, gera grandes resultados.</div>', quiz:[{pergunta:'O que significa Kaizen?',opcoes:['Grande revolução','Mudança para melhor','Padronização','Controle'],certa:1},{pergunta:'Um princípio do Kaizen:',opcoes:['Grandes mudanças','Eliminar desperdícios','Centralizar','Ignorar dados'],certa:1},{pergunta:'Kaizen busca melhorias:',opcoes:['Na produção','Na gestão','Pequenas e diárias','Em crises'],certa:2},{pergunta:'Quem participa das melhorias no Kaizen?',opcoes:['Só a diretoria','Todos os colaboradores','Apenas consultores','Somente a qualidade'],certa:1},{pergunta:'Focar em dados significa:',opcoes:['Decidir por intuição','Basear decisões em medições e fatos','Ignorar indicadores','Esperar o problema piorar'],certa:1},{pergunta:'Padronizar processos ajuda a:',opcoes:['Aumentar a variação','Manter o ganho da melhoria','Eliminar treinamentos','Reduzir a comunicação'],certa:1},{pergunta:'Qual destes é um dos 7 desperdícios?',opcoes:['Trabalho em equipe','Treinamento','Espera','Organização'],certa:2},{pergunta:'Gemba é:',opcoes:['Um tipo de relatório','O local onde o trabalho acontece','Uma ferramenta de estoque','Um prêmio interno'],certa:1},{pergunta:'Reorganizar a bancada para reduzir a movimentação é um exemplo de:',opcoes:['Kaizen','Retrabalho','Burocracia','Desperdício'],certa:0},{pergunta:'Em qual desperdício se enquadra o retrabalho?',opcoes:['Transporte','Estoque','Espera','Defeitos'],certa:3}] },
  { id:'5s', icone:'cleaning_services', titulo:'Os 5S – Organização', conteudo:'<p>Os <strong>5S</strong> organizam o ambiente de trabalho e criam hábitos que ajudam na segurança, na qualidade e na produtividade.</p><h4>Os cinco sensos</h4><div style="overflow-x:auto"><table class="ct-tabela"><tr><th>Senso</th><th>Significado</th><th>Na prática</th></tr><tr><td><b>1. Seiri</b></td><td>Utilização</td><td>Separar o útil do inútil e descartar o que não é necessário</td></tr><tr><td><b>2. Seiton</b></td><td>Organização</td><td>Um lugar para cada coisa, e cada coisa em seu lugar</td></tr><tr><td><b>3. Seiso</b></td><td>Limpeza</td><td>Manter limpo e eliminar a fonte da sujeira</td></tr><tr><td><b>4. Seiketsu</b></td><td>Padronização</td><td>Criar regras e rotinas para manter os três primeiros</td></tr><tr><td><b>5. Shitsuke</b></td><td>Disciplina</td><td>Cumprir os padrões como hábito</td></tr></table></div><div class="ct-alerta">Os 5S são a base de qualquer melhoria: sem organização e disciplina, os ganhos não se mantêm.</div>', quiz:[{pergunta:'Quantos sensos?',opcoes:['3','5','7','10'],certa:1},{pergunta:'Seiri é:',opcoes:['Limpar','Organizar','Separar útil do inútil','Criar padrões'],certa:2},{pergunta:'Disciplina:',opcoes:['Seiso','Seiketsu','Shitsuke','Seiton'],certa:2},{pergunta:'Seiton significa:',opcoes:['Limpar','Organizar','Padronizar','Disciplina'],certa:1},{pergunta:'Qual senso é o Seiso?',opcoes:['Limpeza','Descarte','Padronização','Disciplina'],certa:0},{pergunta:'Seiketsu é o senso de:',opcoes:['Separar','Limpar','Padronizar','Organizar'],certa:2},{pergunta:'Qual senso trata de cumprir os padrões como hábito?',opcoes:['Seiri','Seiso','Shitsuke','Seiton'],certa:2},{pergunta:'“Um lugar para cada coisa e cada coisa em seu lugar” é o senso de:',opcoes:['Seiton (organização)','Seiri (utilização)','Seiso (limpeza)','Seiketsu (padronização)'],certa:0},{pergunta:'Eliminar a fonte da sujeira faz parte do senso de:',opcoes:['Utilização (Seiri)','Disciplina (Shitsuke)','Limpeza (Seiso)','Padronização (Seiketsu)'],certa:2},{pergunta:'Por que os 5S ajudam na segurança?',opcoes:['Eliminam a necessidade de EPIs','Ambientes organizados reduzem riscos','Dispensam treinamento','Não têm relação com segurança'],certa:1}] },
  { id:'pdca', icone:'cycle', titulo:'PDCA – Planejar, Fazer, Checar, Agir', conteudo:'<p>O <strong>PDCA</strong> (Plan, Do, Check, Act) é um ciclo que estrutura melhorias e resolve problemas de forma organizada e repetível.</p><h4>As quatro etapas</h4><div class="cartilha-destaque"><b>P – Planejar:</b> identificar o problema, definir metas e planejar as ações.<br><b>D – Fazer:</b> executar o plano, em pequena escala se possível.<br><b>C – Checar:</b> verificar os resultados comparando com a meta.<br><b>A – Agir:</b> padronizar o que funcionou ou corrigir o que falhou.</div><h4>Ciclo contínuo</h4><p>Ao final do A, o ciclo recomeça: cada volta deixa o processo melhor que a anterior.</p><div class="cartilha-exemplo"><b>Exemplo:</b> o setor tem muitas paradas por falta de material.<br><b>P:</b> medir as paradas e definir a meta de redução.<br><b>D:</b> testar um novo ponto de abastecimento.<br><b>C:</b> comparar as paradas antes e depois.<br><b>A:</b> se reduziu, padronizar.</div>', quiz:[{pergunta:'PDCA significa?',opcoes:['Planejar, Definir, Controlar, Aplicar','Planejar, Fazer, Checar, Agir','Produzir, Distribuir','Padronizar, Dirigir'],certa:1},{pergunta:'Na etapa C?',opcoes:['Executar','Verificar resultados','Padronizar','Definir metas'],certa:1},{pergunta:'PDCA é ciclo:',opcoes:['Linear','Contínuo','Para gestores','Só produção'],certa:1},{pergunta:'Na etapa P (Plan) se faz:',opcoes:['Executar a ação','Definir metas e planejar','Verificar resultados','Padronizar'],certa:1},{pergunta:'A letra D do PDCA é:',opcoes:['Definir','Decidir','Fazer (executar)','Documentar'],certa:2},{pergunta:'Na etapa A (Act), o resultado bom deve ser:',opcoes:['Esquecido','Escondido','Cancelado','Padronizado'],certa:3},{pergunta:'Comparar os resultados com a meta acontece na etapa:',opcoes:['P (Planejar)','D (Fazer)','C (Checar)','A (Agir)'],certa:2},{pergunta:'Se a ação deu certo, o que fazer na etapa A?',opcoes:['Padronizar','Descartar o resultado','Reiniciar sem registrar','Esconder o plano'],certa:0},{pergunta:'Testar a solução em pequena escala acontece em:',opcoes:['P (Planejar)','D (Fazer)','C (Checar)','A (Agir)'],certa:1},{pergunta:'Ao terminar a etapa A, o ciclo:',opcoes:['Termina para sempre','Vira apenas um relatório','Só se repete uma vez','Recomeça, buscando uma nova melhoria'],certa:3}] },
  { id:'ferramentas', icone:'build', titulo:'Ferramentas da Qualidade', conteudo:'<p>As <strong>ferramentas da qualidade</strong> ajudam a entender problemas, encontrar a causa raiz e decidir o que atacar primeiro.</p><h4>As principais</h4><div style="overflow-x:auto"><table class="ct-tabela"><tr><th>Ferramenta</th><th>Para que serve</th></tr><tr><td><b>Ishikawa</b> (espinha de peixe)</td><td>Organiza as possíveis causas de um problema</td></tr><tr><td><b>5 Porquês</b></td><td>Pergunta “por quê?” várias vezes até chegar à causa raiz</td></tr><tr><td><b>Pareto</b></td><td>Mostra que poucas causas geram a maioria dos problemas (regra 80/20) e ajuda a priorizar</td></tr><tr><td><b>Fluxograma</b></td><td>Desenha as etapas de um processo</td></tr><tr><td><b>Folha de verificação</b></td><td>Registra quantas vezes algo acontece</td></tr><tr><td><b>Histograma</b></td><td>Mostra como os dados se distribuem</td></tr></table></div><div class="cartilha-exemplo"><b>6M do Ishikawa:</b> Método, Máquina, Material, Mão de obra, Meio ambiente e Medição.</div>', quiz:[{pergunta:'Causas raiz:',opcoes:['Pareto','Ishikawa','Fluxograma','5 Porquês'],certa:1},{pergunta:'Ishikawa também é:',opcoes:['Causa e Efeito','Pareto','Controle','Fluxograma'],certa:0},{pergunta:'Priorizar problemas:',opcoes:['5 Porquês','Fluxograma','Pareto','Ishikawa'],certa:2},{pergunta:'O diagrama de Pareto serve para:',opcoes:['Priorizar os problemas mais relevantes','Desenhar o fluxo','Registrar presença','Medir temperatura'],certa:0},{pergunta:'Os 5 Porquês buscam:',opcoes:['Culpados','A causa raiz, perguntando "por quê?" repetidamente','Aumentar prazos','Mais documentos'],certa:1},{pergunta:'O fluxograma representa:',opcoes:['Gastos mensais','Causas e efeitos','As etapas de um processo','Pesos de peças'],certa:2},{pergunta:'Os 6M do Ishikawa são:',opcoes:['Método, Máquina, Material, Mão de obra, Meio ambiente e Medição','Mercado, Marca, Meta, Mídia, Moeda e Mês','Manhã, Meio-dia, Metade, Mais, Menos e Média','Motor, Mola, Metal, Molde, Marcha e Manual'],certa:0},{pergunta:'A regra 80/20 está ligada ao diagrama de:',opcoes:['Fluxo','Pareto','Dispersão','Ishikawa'],certa:1},{pergunta:'Qual ferramenta registra quantas vezes algo acontece?',opcoes:['Fluxograma','Ishikawa','Folha de verificação','5 Porquês'],certa:2},{pergunta:'Os 5 Porquês terminam quando:',opcoes:['Se encontra um culpado','Passa um dia','Se escreve o relatório','Se chega à causa raiz'],certa:3}] },
  { id:'seguranca', icone:'security', titulo:'Segurança do Trabalho', conteudo:'<p>Segurança é <strong>prioridade</strong>: nenhuma tarefa é tão urgente que justifique correr riscos.</p><h4>Atitudes essenciais</h4><div class="cartilha-destaque"> • Usar os <b>EPIs</b> exigidos pela atividade<br> • Manter o ambiente organizado (5S)<br> • Conhecer as rotas de fuga e o ramal de emergência<br> • Reportar riscos e quase-acidentes</div><h4>EPI e EPC</h4><ul><li><b>EPI</b> – Equipamento de Proteção Individual: luvas, óculos, protetor auricular, calçado de segurança. Deve estar em bom estado e ser usado corretamente.</li><li><b>EPC</b> – Equipamento de Proteção Coletiva: protege várias pessoas, como proteções de máquinas e sinalizações.</li></ul><h4>Quase-acidente</h4><p>É um evento que <b>poderia</b> ter causado lesão, mas não causou. Reportar permite corrigir a causa antes que alguém se machuque.</p><div class="ct-alerta"><b>Em caso de emergência:</b> mantenha a calma, acione o ramal de emergência (veja em <b>Ramais Úteis</b>) e siga as orientações da brigada.</div>', quiz:[{pergunta:'Primeira ação ao risco?',opcoes:['Ignorar','Sinalizar','Continuar','Aguardar'],certa:1},{pergunta:'EPI é:',opcoes:['Proteção Individual','Produção Interna','Proteção Integrada','Preventivo Industrial'],certa:0},{pergunta:'Emergência:',opcoes:['Correr','Seguir plano','Aguardar','Filmar'],certa:1},{pergunta:'Quando usar o EPI?',opcoes:['Só em inspeções','Sempre que a atividade exigir','Só com supervisor presente','Nunca em áreas limpas'],certa:1},{pergunta:'Piso molhado sem sinalização deve ser:',opcoes:['Ignorado','Atravessado rápido','Reportado e sinalizado','Coberto com papel'],certa:2},{pergunta:'Por que reportar quase-acidentes?',opcoes:['Para punir alguém','Para prevenir acidentes reais','Para aumentar a papelada','Não é necessário'],certa:1},{pergunta:'EPC significa:',opcoes:['Equipamento de Proteção Coletiva','Equipamento Pessoal de Controle','Evento de Prevenção Contínua','Entrada de Pessoal Controlada'],certa:0},{pergunta:'Um quase-acidente é:',opcoes:['Qualquer acidente leve','Um evento que poderia ter causado lesão, mas não causou','Uma falha de relatório','Um treinamento'],certa:1},{pergunta:'Se o seu EPI estiver danificado, você deve:',opcoes:['Usar assim mesmo','Guardar no armário','Trocar e reportar antes de iniciar a tarefa','Emprestar a um colega'],certa:2},{pergunta:'Em caso de emergência, onde encontrar o ramal certo?',opcoes:['Nas Conquistas','No Backup','Nas Estatísticas','Em Ramais Úteis'],certa:3}] },
  { id:'bpf', icone:'medication', titulo:'Boas Práticas de Fabricação', conteudo:'<p>As <strong>Boas Práticas de Fabricação (BPF)</strong> garantem que os medicamentos sejam produzidos de forma consistente e segura, conforme os padrões de qualidade e a regulamentação da Anvisa.</p><h4>Pilares</h4><div class="cartilha-destaque"> • Higiene e paramentação correta<br> • Controle de processos<br> • Rastreabilidade (lotes)<br> • Documentação</div><h4>Documentação correta (ALCOA)</h4><ul><li><b>A</b>tribuível: quem fez, assinou</li><li><b>L</b>egível</li><li><b>C</b>ontemporâneo: registrado na hora</li><li><b>O</b>riginal</li><li><b>A</b>curado</li></ul><div class="ct-alerta"><b>Regra de ouro:</b> se não foi registrado, não foi feito. Erros se corrigem conforme o procedimento, sem apagar o dado original.</div>', quiz:[{pergunta:'BPF garantem?',opcoes:['Produtividade','Qualidade','Custos','Vendas'],certa:1},{pergunta:'Princípio:',opcoes:['Qualquer roupa','Não registrar','Higiene pessoal','Sem supervisão'],certa:2},{pergunta:'Rastreabilidade:',opcoes:['Velocidade','Origem do lote','Menos pessoas','Sem doc'],certa:1},{pergunta:'BPF significa:',opcoes:['Boas Práticas de Fabricação','Boletim de Produção Final','Base de Processos Fixos','Bom Procedimento Fabril'],certa:0},{pergunta:'A documentação nas BPF serve para:',opcoes:['Ocupar espaço','Evidenciar o que foi feito','Substituir o treinamento','Dispensar controles'],certa:1},{pergunta:'Um erro de registro deve ser corrigido:',opcoes:['Apagando com corretivo','Rasgando a folha','Conforme procedimento, sem apagar o dado original','Ignorando'],certa:2},{pergunta:'No ALCOA, “contemporâneo” significa:',opcoes:['Registrar no momento em que a atividade é feita','Registrar no fim do mês','Registrar só em caso de erro','Registrar a lápis'],certa:0},{pergunta:'Para que serve o número de lote?',opcoes:['Decorar a embalagem','Marcar o turno','Rastrear a origem e o destino do produto','Calcular horas extras'],certa:2},{pergunta:'A paramentação correta serve para:',opcoes:['Substituir o treinamento','Proteger o produto e o colaborador contra contaminação','Economizar água','Padronizar a cor do uniforme'],certa:1},{pergunta:'Qual órgão regula as BPF no Brasil?',opcoes:['Detran','INSS','Anatel','Anvisa'],certa:3}] },
  { id:'sustentabilidade', icone:'eco', titulo:'Sustentabilidade', conteudo:'<p>Sustentabilidade é atender às necessidades de hoje sem comprometer as das próximas gerações. Pequenas atitudes diárias fazem diferença.</p><h4>No dia a dia</h4><div class="cartilha-destaque"> • <b>Energia:</b> desligue luzes e equipamentos sem uso<br> • <b>Água:</b> evite desperdício e comunique vazamentos<br> • <b>Resíduos:</b> separe e descarte corretamente<br> • <b>Papel:</b> imprima só o necessário</div><h4>Os 5R</h4><p><b>Repensar, Recusar, Reduzir, Reutilizar e Reciclar.</b> Reduzir e reutilizar vêm antes de reciclar.</p><h4>Coleta seletiva</h4><div style="overflow-x:auto"><table class="ct-tabela"><tr><th>Cor</th><th>Resíduo</th></tr><tr><td>Azul</td><td>Papel</td></tr><tr><td>Vermelho</td><td>Plástico</td></tr><tr><td>Verde</td><td>Vidro</td></tr><tr><td>Amarelo</td><td>Metal</td></tr><tr><td>Marrom</td><td>Orgânicos</td></tr><tr><td>Cinza</td><td>Não reciclável ou misturado</td></tr></table></div>', quiz:[{pergunta:'Contribui:',opcoes:['Luzes acesas','Resíduos corretos','Água excessiva','Imprimir'],certa:1},{pergunta:'Reduzir beneficia:',opcoes:['Ambiente','Empresa','Todos','Ninguém'],certa:2},{pergunta:'NÃO é sustentável:',opcoes:['Desligar','Reciclar','Torneira pingando','Reutilizar papel'],certa:2},{pergunta:'Qual atitude economiza energia?',opcoes:['Deixar equipamentos ligados','Desligar luzes e equipamentos sem uso','Aumentar a iluminação','Abrir janelas com o ar ligado'],certa:1},{pergunta:'Reduzir a impressão ajuda a:',opcoes:['Aumentar resíduos','Elevar o consumo','Gastar menos papel e recursos','Nada'],certa:2},{pergunta:'Resíduo reciclável deve ir para:',opcoes:['O lixo comum','A coleta seletiva correta','A queima','A gaveta'],certa:1},{pergunta:'Na coleta seletiva, qual cor identifica o papel?',opcoes:['Azul','Vermelho','Verde','Amarelo'],certa:0},{pergunta:'Na coleta seletiva, qual cor identifica o vidro?',opcoes:['Azul','Amarelo','Vermelho','Verde'],certa:3},{pergunta:'Entre os 5R, o que vem antes de reciclar?',opcoes:['Descartar','Reduzir e reutilizar','Queimar','Misturar os resíduos'],certa:1},{pergunta:'Ao ver um vazamento de água, você deve:',opcoes:['Ignorar','Esperar secar','Comunicar para que seja corrigido','Cobrir com papel'],certa:2}] },
  { id:'compliance', icone:'gavel', titulo:'Compliance – Ética', conteudo:'<p><strong>Compliance</strong> é agir de acordo com as leis, as normas internas e os princípios éticos, em todas as relações de trabalho.</p><h4>Temas principais</h4><div class="cartilha-destaque"> • <b>Código de Conduta:</b> orienta como agir<br> • <b>Conflito de interesses:</b> quando um interesse pessoal interfere na decisão profissional<br> • <b>Anticorrupção:</b> não oferecer nem aceitar vantagens indevidas<br> • <b>LGPD:</b> proteção de dados pessoais<br> • <b>Canal de Denúncia:</b> relato de condutas antiéticas</div><h4>LGPD na prática</h4><ul><li>Acesse apenas os dados de que precisa para trabalhar</li><li>Não compartilhe dados pessoais sem autorização</li><li>Proteja senhas e documentos</li></ul><div class="ct-alerta"><b>Na dúvida, pergunte.</b> Use o Canal de Denúncia para relatar condutas antiéticas; quem relata de boa-fé não pode sofrer retaliação.</div>', quiz:[{pergunta:'Compliance é?',opcoes:['Cargo','Regras éticas','Treinamento','Ferramenta'],certa:1},{pergunta:'Presente de fornecedor:',opcoes:['Aceitar','Recusar e reportar','Aceitar pequeno','Dividir'],certa:1},{pergunta:'Quem segue?',opcoes:['Diretoria','RH','Todos','Fornecedores'],certa:2},{pergunta:'A LGPD trata de:',opcoes:['Proteção de dados pessoais','Segurança contra incêndio','Escala de turnos','Uniformes'],certa:0},{pergunta:'Conflito de interesses ocorre quando:',opcoes:['Duas equipes se reúnem','Há troca de turma','Interesse pessoal interfere na decisão profissional','Chega uma máquina nova'],certa:2},{pergunta:'O Canal de Denúncia serve para:',opcoes:['Pedir férias','Reportar condutas antiéticas','Trocar escala','Pedir uniforme'],certa:1},{pergunta:'A Lei Anticorrupção proíbe:',opcoes:['Trabalhar em equipe','Oferecer ou aceitar vantagem indevida','Cumprir metas','Participar de treinamentos'],certa:1},{pergunta:'Ao lidar com dados pessoais, o correto é:',opcoes:['Compartilhar com quem pedir','Guardar em qualquer arquivo','Acessar só o necessário para o trabalho','Publicar em grupos de mensagem'],certa:2},{pergunta:'Se tiver dúvida sobre uma conduta, o melhor é:',opcoes:['Perguntar à área responsável antes de agir','Agir e ver o que acontece','Esperar alguém reclamar','Ignorar a dúvida'],certa:0},{pergunta:'O Código de Conduta serve para:',opcoes:['Calcular a escala','Controlar o estoque','Registrar anotações','Orientar como agir de forma ética'],certa:3}] },
  { id:'incendio', icone:'local_fire_department', titulo:'Prevenção de Incêndios', conteudo:'<p>Em uma indústria farmacêutica há materiais inflamáveis e equipamentos elétricos, por isso prevenir é essencial.</p><h4>Classes de incêndio</h4><div style="overflow-x:auto"><table class="ct-tabela"><tr><th>Classe</th><th>Material</th></tr><tr><td><b>A</b></td><td>Sólidos comuns, como papel e madeira</td></tr><tr><td><b>B</b></td><td>Líquidos inflamáveis</td></tr><tr><td><b>C</b></td><td>Equipamentos elétricos energizados (<b>NUNCA água</b>)</td></tr><tr><td><b>D</b></td><td>Metais</td></tr><tr><td><b>K</b></td><td>Óleos e gorduras</td></tr></table></div><h4>Método PASS</h4><div class="cartilha-destaque"><b>P</b>uxar o pino<br><b>A</b>pontar para a base do fogo<br><b>A</b>pertar o gatilho<br><b>V</b>arrer de um lado a outro</div><h4>Em caso de incêndio</h4><ul><li>Acione o alarme e o ramal de emergência</li><li>Se não houver risco, tente controlar o fogo com o extintor adequado</li><li>Abandone a área pela rota de fuga e siga ao ponto de encontro</li><li><b>Nunca use o elevador</b></li></ul><div class="ct-alerta"><b>Prevenção:</b> não bloqueie extintores, hidrantes e saídas; mantenha as áreas limpas e organizadas.</div>', quiz:[{pergunta:'Classe C (elétrico) NUNCA:',opcoes:['CO₂','Pó','Água','Pó Especial'],certa:2},{pergunta:'PASS significa?',opcoes:['Puxar, Apontar, Apertar, Varrer','Parar, Avaliar','Prevenir, Atuar','Pegar, Arremessar'],certa:0},{pergunta:'Área estéril:',opcoes:['Pó','Água','CO₂','Espuma'],certa:2},{pergunta:'Classe B envolve:',opcoes:['Sólidos comuns','Metais','Líquidos inflamáveis','Equipamentos elétricos'],certa:2},{pergunta:'Incêndio em gorduras é classe:',opcoes:['A','C','D','K'],certa:3},{pergunta:'O primeiro passo do PASS é:',opcoes:['Puxar o pino','Apontar','Apertar','Varrer'],certa:0},{pergunta:'A classe A de incêndio envolve:',opcoes:['Líquidos inflamáveis','Sólidos comuns, como papel e madeira','Equipamentos elétricos','Metais'],certa:1},{pergunta:'Em caso de incêndio, o elevador deve ser:',opcoes:['Usado, por ser mais rápido','Usado apenas se estiver vazio','Evitado: use sempre as escadas','Reservado aos gestores'],certa:2},{pergunta:'Qual destes itens nunca deve ser bloqueado?',opcoes:['Extintores, hidrantes e saídas','Apenas a copa','Apenas armários','Nenhum deles'],certa:0},{pergunta:'Depois de acionar o alarme e deixar a área, você vai para:',opcoes:['O posto de trabalho','O ponto de encontro','A porta do prédio','O estacionamento, sem avisar'],certa:1}] }
];

const CART_META = {
  'comousar': { g:'inicio', r:'Escala, anotações, férias, pedidos, backup e atalhos do menu.' },
  'kaizen': { g:'melhoria', r:'Cultura de pequenas melhorias diárias, feitas por todos.' },
  '5s': { g:'melhoria', r:'Cinco sensos para um ambiente organizado, limpo e seguro.' },
  'pdca': { g:'melhoria', r:'Ciclo de quatro etapas para resolver problemas e manter resultados.' },
  'ferramentas': { g:'melhoria', r:'Ishikawa, 5 Porquês, Pareto e fluxograma para achar causas e priorizar.' },
  'seguranca': { g:'seguranca', r:'EPIs, riscos, quase-acidentes e atitudes seguras no dia a dia.' },
  'incendio': { g:'seguranca', r:'Classes de fogo, extintores, método PASS e rota de fuga.' },
  'bpf': { g:'seguranca', r:'Higiene, processos, rastreabilidade e documentação na fabricação.' },
  'compliance': { g:'cultura', r:'Ética, Código de Conduta, LGPD e Canal de Denúncia.' },
  'sustentabilidade': { g:'cultura', r:'Energia, água, resíduos e consumo consciente.' },
};
const CART_GRUPOS = [
  { id:'inicio', nome:'Primeiros passos' },
  { id:'melhoria', nome:'Melhoria contínua' },
  { id:'seguranca', nome:'Segurança e qualidade' },
  { id:'cultura', nome:'Cultura e responsabilidade' }
];
cartilhasData.forEach(function (c) { const m = CART_META[c.id] || { g:'inicio', r:'' }; c.grupo = m.g; c.resumo = m.r; });

let cartilhaAtiva = null;          // null = biblioteca; id = leitura
let ctQuiz = null;                 // { id, i, acertos, res:[], sel, estado:'pergunta'|'resposta'|'fim' }
let cartilhasLidas = getJSON('braun_cartilhas_lidas', []);
let quizOk = getJSON('braun_quiz_ok', []);          // acertos únicos: 'cartilha:indice'
let quizMelhor = getJSON('braun_quiz_melhor', {});  // melhor nota por cartilha
let quizzesAcertados = parseInt(getStorageValue('braun_quizzes_acertados') || '0', 10) || 0;

function openCartilhas() { closeHamburger(); renderCartilhas(); focusModal('cartilhasCard'); }
function abrirCartilha(id) { cartilhaAtiva = id; ctQuiz = null; renderCartilhas(); const c = document.getElementById('cartilhasCard'); if (c) c.scrollTop = 0; }
function voltarBibliotecaCartilhas() { cartilhaAtiva = null; ctQuiz = null; renderCartilhas(); const c = document.getElementById('cartilhasCard'); if (c) c.scrollTop = 0; }
function cartilhaPorId(id) { return cartilhasData.filter(function (c) { return c.id === id; })[0] || null; }
function ctLida(id) { return cartilhasLidas.indexOf(id) > -1; }
function totalPerguntas() { return cartilhasData.reduce(function (n, c) { return n + c.quiz.length; }, 0); }
function minutosLeitura(c) {
  const t = String(c.conteudo).replace(/<[^>]+>/g, ' ');
  return Math.max(1, Math.round(t.split(/\s+/).filter(Boolean).length / 150));
}
function nomeGrupo(id) { const g = CART_GRUPOS.filter(function (x) { return x.id === id; })[0]; return g ? g.nome : ''; }
function icoStatus(nome, anim, cor) { return '<span class="pg-ico big" style="background:' + cor + '"><span class="material-symbols-outlined ' + anim + '" aria-hidden="true">' + nome + '</span></span>'; }
function icoCt(nome) { return '<span class="material-symbols-outlined" aria-hidden="true">' + nome + '</span>'; }

function renderCartilhas(manterScroll) {
  const card = document.getElementById('cartilhasCard'); if (!card) return;
  const y = card.scrollTop;
  const lista = document.getElementById('ctLista'), leitura = document.getElementById('ctLeitura');
  const voltar = card.querySelector('.modal-x');
  if (voltar) voltar.setAttribute('data-action', cartilhaAtiva ? 'cartilha-lista' : 'close-modals');
  if (cartilhaAtiva && cartilhaPorId(cartilhaAtiva)) {
    lista.classList.add('ct-oculto'); leitura.classList.remove('ct-oculto');
    renderCartilhaLeitura(cartilhaPorId(cartilhaAtiva));
  } else {
    cartilhaAtiva = null;
    leitura.classList.add('ct-oculto'); lista.classList.remove('ct-oculto');
    renderCartilhasLista();
  }
  if (manterScroll) card.scrollTop = y;
}

function renderCartilhasLista() {
  const tot = cartilhasData.length, lidas = cartilhasLidas.length, pct = Math.round((lidas / tot) * 100);
  const el = document.getElementById('ctResumo');
  el.innerHTML =
    '<div class="ct-stats">' +
      '<div class="ct-stat"><b>' + lidas + '/' + tot + '</b><span>Lidas</span></div>' +
      '<div class="ct-stat"><b>' + quizOk.length + '/' + totalPerguntas() + '</b><span>Acertos no quiz</span></div>' +
      '<div class="ct-stat"><b>' + pct + '%</b><span>Progresso</span></div>' +
    '</div>' +
    '<div class="ct-barra" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '" aria-label="Progresso de leitura"><i style="width:' + pct + '%"></i></div>';
  const prox = cartilhasData.filter(function (c) { return !ctLida(c.id); })[0];
  const cont = document.getElementById('ctContinuar');
  cont.innerHTML = prox
    ? '<button type="button" class="ct-continuar" data-ct="abrir" data-cart="' + prox.id + '"><span class="ct-c-ico">' + icoCt(lidas ? 'play_arrow' : 'rocket_launch') + '</span><span><small>' + (lidas ? 'Continuar de onde parou' : 'Comece por aqui') + '</small><strong>' + prox.titulo + '</strong></span></button>'
    : '<div class="ct-parabens">' + icoCt('emoji_events') + '<span><b>Parabéns!</b> Você concluiu todas as cartilhas.</span></div>';
  const g = document.getElementById('ctGrupos');
  g.innerHTML = CART_GRUPOS.map(function (gr) {
    const itens = cartilhasData.filter(function (c) { return c.grupo === gr.id; });
    if (!itens.length) return '';
    const l = itens.filter(function (c) { return ctLida(c.id); }).length;
    return '<div class="ct-grupo-titulo"><span>' + gr.nome + '</span><span>' + l + '/' + itens.length + '</span></div>' +
      itens.map(function (c) {
        const lida = ctLida(c.id), melhor = quizMelhor[c.id];
        return '<button type="button" class="ct-card' + (lida ? ' lida' : '') + '" data-ct="abrir" data-cart="' + c.id + '">' +
          '<span class="ct-card-icon">' + icoCt(c.icone) + '</span>' +
          '<span class="ct-card-body">' +
            '<span class="ct-card-titulo">' + c.titulo + '</span>' +
            '<span class="ct-card-resumo">' + c.resumo + '</span>' +
            '<span class="ct-card-meta"><span>' + icoCt('schedule') + minutosLeitura(c) + ' min</span><span>' + icoCt('quiz') + c.quiz.length + ' perguntas</span>' +
              (melhor !== undefined ? '<span>' + icoCt('military_tech') + 'Melhor: ' + melhor + '/' + c.quiz.length + '</span>' : '') + '</span>' +
          '</span>' +
          '<span class="ct-card-status">' + (lida ? icoCt('check_circle') + 'Lida' : icoCt('chevron_right')) + '</span>' +
        '</button>';
      }).join('');
  }).join('');
}

function renderCartilhaLeitura(c) {
  const lida = ctLida(c.id), melhor = quizMelhor[c.id];
  const i = cartilhasData.indexOf(c), prox = cartilhasData[i + 1] || null;
  document.getElementById('ctLeitura').innerHTML =
    '<div class="ct-eyebrow">' + nomeGrupo(c.grupo) + '</div>' +
    '<h2 class="ct-leitura-titulo">' + icoCt(c.icone) + '<span>' + c.titulo + '</span></h2>' +
    '<div class="ct-leitura-meta"><span class="ct-chip ' + (lida ? 'lida' : 'nova') + '">' + (lida ? 'Lida' : 'Não lida') + '</span>' +
      '<span>' + icoCt('schedule') + minutosLeitura(c) + ' min de leitura</span><span>' + icoCt('quiz') + c.quiz.length + ' perguntas</span>' +
      (melhor !== undefined ? '<span>' + icoCt('military_tech') + 'Melhor: ' + melhor + '/' + c.quiz.length + '</span>' : '') + '</div>' +
    '<div class="cartilha-conteudo">' + c.conteudo + '</div>' +
    '<section class="ct-quiz" id="ctQuiz" aria-live="polite"></section>' +
    '<button type="button" class="ct-btn ' + (lida ? 'secundario' : 'roxo') + '" data-ct="marcar" data-cart="' + c.id + '">' + icoCt(lida ? 'undo' : 'check_circle') + (lida ? 'Desmarcar como lida' : 'Marcar como lida') + '</button>' +
    (prox ? '<button type="button" class="ct-btn secundario" data-ct="abrir" data-cart="' + prox.id + '">Próxima: ' + prox.titulo.split('–')[0].trim() + icoCt('arrow_forward') + '</button>' : '') +
    '<button type="button" class="ct-btn texto" data-ct="lista">' + icoCt('apps') + 'Ver todas as cartilhas</button>';
  renderCtQuiz();
}

/* ---------- Quiz por etapas ---------- */
function renderCtQuiz() {
  const box = document.getElementById('ctQuiz'); if (!box) return;
  const c = cartilhaPorId(cartilhaAtiva); if (!c) return;
  const n = c.quiz.length;
  if (!ctQuiz) {
    const melhor = quizMelhor[c.id];
    box.innerHTML = '<div class="ct-eyebrow">Quiz</div><h3 class="ct-quiz-titulo">Teste seus conhecimentos</h3>' +
      '<p class="ct-quiz-txt">' + n + ' perguntas sobre este tema.' + (melhor !== undefined ? ' Seu melhor resultado: <b>' + melhor + '/' + n + '</b>.' : '') + '</p>' +
      '<button type="button" class="ct-btn primario" data-ct="quiz-iniciar">' + icoCt('play_arrow') + (melhor !== undefined ? 'Refazer quiz' : 'Iniciar quiz') + '</button>';
    return;
  }
  const seg = function () {
    let h = '<div class="ct-quiz-seg" aria-hidden="true">';
    for (let k = 0; k < n; k++) {
      const cl = ctQuiz.res[k] === true ? 'ok' : ctQuiz.res[k] === false ? 'erro' : (k === ctQuiz.i && ctQuiz.estado !== 'fim' ? 'atual' : '');
      h += '<i class="' + cl + '"></i>';
    }
    return h + '</div>';
  };
  if (ctQuiz.estado === 'fim') {
    const pct = Math.round((ctQuiz.acertos / n) * 100);
    const msg = pct >= 90 ? 'Excelente! Você domina o tema.' : pct >= 70 ? 'Muito bom! Falta pouco para a nota máxima.' : pct >= 50 ? 'Bom começo. Releia os pontos principais e tente de novo.' : 'Releia a cartilha com calma e refaça o quiz.';
    box.innerHTML = '<div class="ct-eyebrow">Resultado</div>' + seg() +
      '<div class="ct-resultado"><div class="nota">' + ctQuiz.acertos + '/' + n + '</div><p>' + msg + '</p></div>' +
      '<button type="button" class="ct-btn primario" data-ct="quiz-refazer">' + icoCt('replay') + 'Refazer quiz</button>';
    return;
  }
  const q = c.quiz[ctQuiz.i], resp = ctQuiz.estado === 'resposta';
  let ops = '';
  q.opcoes.forEach(function (op, oi) {
    let cl = 'quiz-opcao';
    if (resp) { cl += ' desabilitada'; if (oi === q.certa) cl += ' certa'; else if (oi === ctQuiz.sel) cl += ' errada'; }
    ops += '<button type="button" class="' + cl + '" data-ct="quiz-opcao" data-o="' + oi + '"' + (resp ? ' disabled' : '') + '>' + op + '</button>';
  });
  let fb = '';
  if (resp) {
    const ok = ctQuiz.sel === q.certa;
    fb = '<div class="quiz-feedback ' + (ok ? 'certo' : 'errado') + '">' + (ok ? 'Correto!' : 'Incorreto. A resposta certa é: ' + q.opcoes[q.certa]) + '</div>' +
      '<button type="button" class="ct-btn primario" data-ct="quiz-proxima">' + (ctQuiz.i + 1 < n ? 'Próxima pergunta' : 'Ver resultado') + icoCt('arrow_forward') + '</button>';
  }
  box.innerHTML = '<div class="ct-quiz-topo"><span class="ct-eyebrow">Quiz</span><span class="ct-quiz-pos">Pergunta ' + (ctQuiz.i + 1) + ' de ' + n + '</span></div>' + seg() +
    '<div class="quiz-pergunta">' + q.pergunta + '</div><div class="quiz-opcoes">' + ops + '</div>' + fb;
}
function iniciarCtQuiz() { ctQuiz = { id: cartilhaAtiva, i: 0, acertos: 0, res: [], sel: -1, estado: 'pergunta' }; renderCtQuiz(); const b = document.getElementById('ctQuiz'); if (b && b.scrollIntoView) b.scrollIntoView({ block: 'start' }); }
function registrarAcertoUnico(id, qi) {
  const k = id + ':' + qi;
  if (quizOk.indexOf(k) > -1) return;
  quizOk.push(k); setStorageValue('braun_quiz_ok', JSON.stringify(quizOk));
  quizzesAcertados++; setStorageValue('braun_quizzes_acertados', quizzesAcertados);
  if (quizzesAcertados === 10) salvarConquista('quiz_master');
}
function responderCtQuiz(oi) {
  if (!ctQuiz || ctQuiz.estado !== 'pergunta') return;
  const c = cartilhaPorId(ctQuiz.id); if (!c) return;
  const ok = oi === c.quiz[ctQuiz.i].certa;
  ctQuiz.estado = 'resposta'; ctQuiz.sel = oi; ctQuiz.res[ctQuiz.i] = ok;
  if (ok) { ctQuiz.acertos++; registrarAcertoUnico(c.id, ctQuiz.i); }
  renderCtQuiz();
}
function proximaCtPergunta() {
  if (!ctQuiz || ctQuiz.estado !== 'resposta') return;
  const c = cartilhaPorId(ctQuiz.id); if (!c) return;
  if (ctQuiz.i + 1 < c.quiz.length) { ctQuiz.i++; ctQuiz.estado = 'pergunta'; ctQuiz.sel = -1; }
  else {
    ctQuiz.estado = 'fim';
    if (quizMelhor[c.id] === undefined || ctQuiz.acertos > quizMelhor[c.id]) { quizMelhor[c.id] = ctQuiz.acertos; setStorageValue('braun_quiz_melhor', JSON.stringify(quizMelhor)); }
  }
  renderCtQuiz();
  const b = document.getElementById('ctQuiz'); if (b && b.scrollIntoView) b.scrollIntoView({ block: 'start' });
}

function toggleCartilhaLida(id) {
  const i = cartilhasLidas.indexOf(id);
  if (i > -1) cartilhasLidas.splice(i, 1);
  else {
    cartilhasLidas.push(id);
    if (cartilhasLidas.length === 1) salvarConquista('primeiro_passo');
    if (cartilhasLidas.length === 5) salvarConquista('leitor_dedicado');
    if (cartilhasLidas.length === cartilhasData.length) salvarConquista('expert_braun');
  }
  setStorageValue('braun_cartilhas_lidas', JSON.stringify(cartilhasLidas));
  renderCartilhas(true); atualizarNovidadesUI();
}
function bindCartilhas() {
  const card = document.getElementById('cartilhasCard'); if (!card) return;
  card.addEventListener('click', function (e) {
    const el = e.target.closest('[data-ct]'); if (!el || !card.contains(el)) return;
    const a = el.getAttribute('data-ct');
    if (a === 'abrir') abrirCartilha(el.getAttribute('data-cart'));
    else if (a === 'marcar') toggleCartilhaLida(el.getAttribute('data-cart'));
    else if (a === 'lista') voltarBibliotecaCartilhas();
    else if (a === 'quiz-iniciar' || a === 'quiz-refazer') iniciarCtQuiz();
    else if (a === 'quiz-opcao') responderCtQuiz(parseInt(el.getAttribute('data-o'), 10));
    else if (a === 'quiz-proxima') proximaCtPergunta();
  });
}

/* ============================================================
   21) NOVIDADES
   ============================================================ */
const novidadesData = [
  { id:'nov24', titulo:'🎨 Novo visual em todo o app', descricao:'As telas do menu ganharam um novo padrão, com títulos, cartões e ícones iguais em todo o app, e o botão Voltar fica no topo de cada tela. As Cartilhas agora têm biblioteca por temas e quiz por etapas, com 101 perguntas, e os Ramais Úteis ganharam busca.', data:'2026-11-07', cartilhaId:null },
  { id:'nov23', titulo:'🗳️ Votação do Colaborador do Mês melhorada', descricao:'Agora o formulário de votação é preenchido automaticamente com seus dados. Digite apenas o nome do colega que você quer votar.', data:'2026-10-02', cartilhaId:null },
  { id:'nov22', titulo:'🏖️ Sugestão inteligente de férias!', descricao:'Agora o app te ajuda a escolher a MELHOR data para suas férias. Você escolhe o mês e a quantidade de dias, e ele mostra as datas que rendem mais dias em casa respeitando sua escala. Acesse: Configurações → Programar Férias.', data:'2026-10-01', cartilhaId:'comousar' },
  { id:'nov20', titulo:'🌞 Saudação Minimalista funcionando', descricao:'Agora o toggle "Saudação Minimalista" realmente funciona. Mostra apenas "Bom dia / Boa tarde / Boa noite".', data:'2026-10-01', cartilhaId:null },
  { id:'nov19', titulo:'📦 Meus Pedidos reformulado!', descricao:'Agora você preenche a quantidade e o tamanho de cada item. O pedido vai direto por e-mail.', data:'2026-09-30', cartilhaId:null },
  { id:'nov18', titulo:'📘 Nova Cartilha: Como usar o Braun OnLine', descricao:'Guia rápido com tudo o que você precisa saber.', data:'2026-09-28', cartilhaId:'comousar' },
  { id:'nov17', titulo:'🔒 Backup e Restauração', descricao:'Exporte e importe todos os seus dados em JSON.', data:'2026-09-27', cartilhaId:null },
  { id:'nov5', titulo:'🧯 Nova Cartilha: Prevenção de Incêndios', descricao:'Aprenda sobre classes de incêndio e método PASS.', data:'2026-07-05', cartilhaId:'incendio' },
  { id:'nov1', titulo:'📘 Nova Cartilha: Compliance', descricao:'Ética, Código de Conduta, LGPD e Canal de Denúncia.', data:'2026-07-04', cartilhaId:'compliance' }
];
const NOV_ICO = { nov24:'palette', nov23:'how_to_vote', nov22:'beach_access', nov20:'wb_sunny', nov19:'inventory_2', nov18:'menu_book', nov17:'cloud_sync', nov5:'local_fire_department', nov1:'menu_book' };
let novidadesLidas = getJSON('braun_novidades_lidas', []);

function openNovidades() { closeAllModals(); renderNovidades(); focusModal('novidadesCard'); }
function renderNovidades() {
  const c = document.getElementById('novidadesLista'); c.innerHTML = '';
  const sorted = novidadesData.slice().sort(function (a, b) { return new Date(b.data) - new Date(a.data); });
  sorted.forEach(function (nov) {
    const lida = novidadesLidas.indexOf(nov.id) > -1;
    const card = document.createElement('div');
    card.className = 'novidade-card' + (lida ? ' lida' : '');
    const b = !lida ? '<span class="badge-novo">NOVO</span>' : '';
    let lh = '';
    if (nov.cartilhaId) lh = '<span class="link-cartilha" data-cart="' + nov.cartilhaId + '">Abrir cartilha <span class="material-symbols-outlined" aria-hidden="true" style="font-size:16px;">arrow_forward</span></span>';
    const ico = NOV_ICO[nov.id] || (nov.cartilhaId ? 'menu_book' : 'notifications');
    const titulo = String(nov.titulo).replace(/^[^\p{L}\p{N}]+/u, '');
    card.innerHTML = '<span class="pg-ico"><span class="material-symbols-outlined" aria-hidden="true">' + ico + '</span></span><div class="nov-body"><div class="novidade-titulo">' + titulo + ' ' + b + '</div><div class="novidade-desc">' + nov.descricao + '</div>' + lh + '<span class="novidade-data">' + formatarData(nov.data) + '</span></div>';
    card.addEventListener('click', function (e) {
      const l = e.target.closest('.link-cartilha');
      if (l) { e.stopPropagation(); abrirCartilhaPorId(l.dataset.cart); return; }
      marcarNovidadeLida(nov.id);
      if (nov.cartilhaId) abrirCartilhaPorId(nov.cartilhaId);
      else { renderNovidades(); atualizarNovidadesUI(); }
    });
    c.appendChild(card);
  });
  atualizarNovidadesUI();
}
function marcarNovidadeLida(id) {
  if (novidadesLidas.indexOf(id) === -1) { novidadesLidas.push(id); setStorageValue('braun_novidades_lidas', JSON.stringify(novidadesLidas)); }
  renderNovidades(); atualizarNovidadesUI();
}
function marcarTodasNovidadesLidas() {
  novidadesData.forEach(function (n) { if (novidadesLidas.indexOf(n.id) === -1) novidadesLidas.push(n.id); });
  setStorageValue('braun_novidades_lidas', JSON.stringify(novidadesLidas));
  renderNovidades(); atualizarNovidadesUI();
  toast('Todas as novidades marcadas como lidas.', 'info');
}
function atualizarNovidadesUI() {
  const nl = novidadesData.length - novidadesLidas.length;
  const b = document.getElementById('novidadesBadge');
  const btn = document.getElementById('btn-flutuante-novidades');
  const s = document.getElementById('sinoIcon');
  if (nl > 0) { b.style.display = 'inline'; b.innerText = nl; btn.style.display = 'flex'; s.classList.add('animar-sino'); }
  else { b.style.display = 'none'; btn.style.display = 'none'; s.classList.remove('animar-sino'); }
}
function formatarData(ds) { return new Date(ds + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }); }
function abrirCartilhaPorId(id) { closeAllModals(); cartilhaAtiva = id; ctQuiz = null; openCartilhas(); }

/* ============================================================
   22) PESQUISA + VOZ
   ============================================================ */
let resultadoPesquisaAtual = null;
let recognitionInstance = null;
function openPesquisa() {
  closeAllModals(); focusModal('pesquisaCard');
  const h = new Date();
  document.getElementById('pesquisaData').value = h.toISOString().split('T')[0];
  document.getElementById('pesquisaDataTexto').value = '';
  document.getElementById('resultadoTexto').innerHTML = 'Nenhuma pesquisa realizada.';
  document.getElementById('resultadoTexto').style.color = '';
  document.getElementById('resultadoDetalhe').innerText = '';
  resultadoPesquisaAtual = null; atualizarBotaoOuvir();
}
function fecharPesquisa() { closeAllModals(); pararVoz(); }
function atualizarBotaoOuvir() {
  const b = document.getElementById('btnOuvirResultado'), i = document.getElementById('btnOuvirIcon'), t = document.getElementById('btnOuvirTexto');
  if (!b) return;
  const f = window.speechSynthesis && window.speechSynthesis.speaking;
  if (f) { b.classList.add('parar'); i.textContent = 'stop_circle'; t.textContent = 'Parar'; }
  else { b.classList.remove('parar'); i.textContent = 'volume_up'; t.textContent = 'Ouvir resposta'; }
}
function toggleLerResultado() { if (window.speechSynthesis && window.speechSynthesis.speaking) pararVoz(); else lerResultado(); }
function pararVoz() { if (window.speechSynthesis) window.speechSynthesis.cancel(); atualizarBotaoOuvir(); }
function parseDataTexto(texto) {
  const meses = { janeiro:0, fevereiro:1, marco:2, 'março':2, abril:3, maio:4, junho:5, julho:6, agosto:7, setembro:8, outubro:9, novembro:10, dezembro:11, jan:0, fev:1, mar:2, abr:3, mai:4, jun:5, jul:6, ago:7, set:8, out:9, nov:10, dez:11 };
  texto = texto.toLowerCase().trim();
  let m = texto.match(/^(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{2,4})$/);
  if (m) { let d = parseInt(m[1]), me = parseInt(m[2]) - 1, a = parseInt(m[3]); if (a<100) a+=2000; const dt = new Date(a, me, d); if (!isNaN(dt.getTime())) return dt; }
  m = texto.match(/^(\d{1,2})\s*(?:de\s*)?([a-zçãáé]+)\s*(?:de\s*)?(\d{2,4})$/);
  if (m) { let d = parseInt(m[1]), mn = m[2], a = parseInt(m[3]); if (a<100) a+=2000; if (meses[mn]!==undefined) { const dt = new Date(a, meses[mn], d); if (!isNaN(dt.getTime())) return dt; } }
  m = texto.match(/^([a-zçãáé]+)\s*(?:de\s*)?(\d{2,4})$/);
  if (m) { let mn = m[1], a = parseInt(m[2]); if (a<100) a+=2000; if (meses[mn]!==undefined) { const dt = new Date(a, meses[mn], 1); if (!isNaN(dt.getTime())) return dt; } }
  return null;
}
function pesquisarData() {
  const di = document.getElementById('pesquisaData').value;
  let ti = document.getElementById('pesquisaDataTexto').value.trim();
  let do_ = null;
  if (ti) { do_ = parseDataTexto(ti); if (do_) { document.getElementById('pesquisaData').value = do_.getFullYear() + '-' + String(do_.getMonth()+1).padStart(2,'0') + '-' + String(do_.getDate()).padStart(2,'0'); } }
  else if (di) { const p = di.split('-'); do_ = new Date(parseInt(p[0]), parseInt(p[1])-1, parseInt(p[2])); }
  const rd = document.getElementById('resultadoTexto'), dd = document.getElementById('resultadoDetalhe');
  if (!do_ || isNaN(do_.getTime())) { rd.innerHTML = icoStatus('error', '', 'var(--accent)') + '<div>Data inválida.</div>'; dd.innerText = 'Use dd/mm/aaaa.'; resultadoPesquisaAtual = null; atualizarBotaoOuvir(); return; }
  const r = currentRegion, t = currentTurma;
  const trab = isTrabalhando(do_, r, t), fer = isFerias(do_);
  let st, cor, ih, det;
  const rn = nomeRegiao(r), tf = formatarTurmaParaVoz(t);
  if (r === '1x1') det = 'Região: Escala ' + tf; else det = 'Região: ' + rn + ' · Turmas ' + tf;
  const modoP = modoFeriados();
  const fnomeP = getFeriados(do_.getFullYear())[String(do_.getMonth() + 1).padStart(2, '0') + '-' + String(do_.getDate()).padStart(2, '0')] || '';
  if (modoP) {
    if (fer) { st = 'EM FÉRIAS'; cor = 'var(--ferias)'; ih = icoStatus('flight', 'icone-ferias', cor); }
    else if (fnomeP) { st = 'FERIADO'; cor = 'var(--accent)'; ih = icoStatus('celebration', 'icone-folga', cor); }
    else { st = 'SEM FERIADO'; cor = 'var(--primary)'; ih = icoStatus('event', '', cor); }
    det = fnomeP;
  }
  else if (fer) { st = 'EM FÉRIAS'; cor = 'var(--ferias)'; ih = icoStatus('flight', 'icone-ferias', cor); }
  else if (trab) {
    if (r === '1x1') st = isTurnoNoite1x1(t) ? 'TRABALHANDO (NOITE)' : 'TRABALHANDO (MANHÃ)'; else st = 'TRABALHANDO';
    cor = r === '1x1' && isTurnoNoite1x1(t) ? 'var(--roxo-1x1)' : 'var(--accent)';
    ih = icoStatus('settings', 'icone-trabalho', cor);
  } else { st = 'DE FOLGA'; cor = 'var(--primary)'; ih = icoStatus('beach_access', 'icone-folga', cor); }
  rd.style.color = cor;
  rd.innerHTML = ih + '<div><strong>' + diaDaSemanaPorExtenso(do_) + ', ' + do_.toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' }) + '</strong></div><div style="font-size:1.1em;">' + st + '</div>';
  dd.innerText = det;
  resultadoPesquisaAtual = { data: do_, status: st, detalhes: det, ferias: fer, trabalhando: trab, modo: modoP, feriado: fnomeP };
  atualizarBotaoOuvir();
  if (getStorageValue('braun_voice_response') !== 'false') lerResultado();
}
function iniciarReconhecimentoVoz() {
  const ct = document.getElementById('pesquisaDataTexto'); if (!ct) return;
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) { ct.placeholder = 'Sem suporte.'; toast('Navegador sem suporte a voz.', 'aviso'); return; }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (recognitionInstance) { recognitionInstance.abort(); recognitionInstance = null; }
  const rec = new SR(); rec.lang = 'pt-BR'; rec.continuous = false; rec.interimResults = false;
  rec.onstart = function () { ct.placeholder = 'Ouvindo...'; ct.style.borderColor = 'var(--accent)'; };
  rec.onerror = function (e) { ct.placeholder = 'Toque no microfone...'; ct.style.borderColor = ''; recognitionInstance = null; if (e.error === 'not-allowed') toast('Permissão negada.', 'erro'); };
  rec.onresult = function (e) { ct.value = e.results[0][0].transcript; ct.placeholder = 'Toque no microfone...'; ct.style.borderColor = ''; recognitionInstance = null; pesquisarData(); };
  rec.onend = function () { ct.placeholder = 'Toque no microfone...'; ct.style.borderColor = ''; recognitionInstance = null; };
  try { rec.start(); recognitionInstance = rec; } catch (e) { console.warn(e); }
}
/* ---------- Voz da resposta: feminina / masculina, usando as melhores vozes do aparelho ---------- */
function vozesPt() {
  if (!window.speechSynthesis) return [];
  const todas = window.speechSynthesis.getVoices() || [];
  const pt = todas.filter(function (v) { return /^pt([-_]|$)/i.test(v.lang || ''); });
  const br = pt.filter(function (v) { return /^pt[-_]br/i.test(v.lang || ''); });
  return br.length ? br : pt;
}
function pontuarVoz(v) {
  const n = ((v.name || '') + ' ' + (v.voiceURI || '')).toLowerCase();
  let p = 0;
  if (/natural|neural|online|premium|enhanced|wavenet|studio/.test(n)) p += 6;
  if (/network|google|microsoft|siri/.test(n)) p += 3;
  if (v.localService === false) p += 2;
  if (/compact|espeak|robot/.test(n)) p -= 5;
  return p;
}
function generoVoz(v) {
  const n = ((v.name || '') + ' ' + (v.voiceURI || '')).toLowerCase();
  if (/female|feminin|francisca|thalita|maria|luciana|fernanda|vit[oó]ria|camila|joana|helena|raquel|\bafs\b|[-_]f\d|smt-f/.test(n)) return 'f';
  if (/\bmale\b|masculin|antonio|ant[oô]nio|felipe|donato|jorge|ricardo|daniel|\bptd\b|[-_]m\d|smt-m/.test(n)) return 'm';
  return '';
}
function obterGeneroVoz() { return getStorageValue('braun_voz_genero') === 'm' ? 'm' : 'f'; }
function escolherVoz(g) {
  const lista = vozesPt().sort(function (a, b) { return pontuarVoz(b) - pontuarVoz(a); });
  // 1) voz que o usuário escolheu para este gênero
  const salva = getStorageValue('braun_voz_nome_' + g);
  if (salva && salva !== 'auto') {
    const v = lista.filter(function (x) { return x.voiceURI === salva; })[0];
    if (v) return { voz: v, tom: 1, rate: 1 };
  }
  // 2) voz que o nome indica ser do gênero pedido
  const doGenero = lista.filter(function (v) { return generoVoz(v) === g; })[0];
  if (doGenero) return { voz: doGenero, tom: 1, rate: 1 };
  // 3) masculina sem pista pelo nome: usa OUTRA voz diferente da feminina, se o aparelho tiver mais de uma
  if (g === 'm') {
    const fem = escolherVoz('f').voz;
    const outra = lista.filter(function (v) { return v !== fem && generoVoz(v) !== 'f'; })[0]
      || lista.filter(function (v) { return v !== fem; })[0];
    if (outra) return { voz: outra, tom: 0.9, rate: 1 };
  }
  // 4) só uma voz: usa a melhor e ajusta o tom (muitas vozes online ignoram o tom)
  const base = lista.filter(function (v) { return generoVoz(v) !== (g === 'f' ? 'm' : 'f'); })[0] || lista[0] || null;
  const gb = base ? generoVoz(base) : '';
  let tom = 1;
  if (gb && gb !== g) tom = g === 'm' ? 0.78 : 1.2;
  else if (!gb) tom = g === 'm' ? 0.78 : 1;
  return { voz: base, tom: tom, rate: tom === 1 ? 1 : 0.97 };
}
function falar(texto) {
  if (!window.speechSynthesis) { toast('Navegador sem suporte a voz.', 'aviso'); return; }
  const esc = escolherVoz(obterGeneroVoz());
  const frases = texto.match(/[^.!?]+[.!?]?/g) || [texto];
  window.speechSynthesis.cancel();
  frases.forEach(function (f, i) {
    const t = f.trim(); if (!t) return;
    const u = new SpeechSynthesisUtterance(t);
    u.lang = (esc.voz && esc.voz.lang) || 'pt-BR';
    if (esc.voz) u.voice = esc.voz;
    u.rate = esc.rate; u.pitch = esc.tom;
    if (i === frases.length - 1) { u.onend = atualizarBotaoOuvir; u.onerror = atualizarBotaoOuvir; }
    window.speechSynthesis.speak(u);
  });
  setTimeout(atualizarBotaoOuvir, 100);
}
function textoNaturalResultado(r) {
  const d = r.data, dia = d.getDate();
  const mes = d.toLocaleDateString('pt-BR', { month: 'long' });
  const cab = diaDaSemanaPorExtenso(d) + ', ' + (dia === 1 ? 'primeiro' : dia) + ' de ' + mes + ' de ' + d.getFullYear() + '.';
  if (r.modo) return cab + ' ' + (r.ferias ? 'Nesse dia, você está de férias.' : r.feriado ? 'Nesse dia é feriado: ' + r.feriado + '.' : 'Nesse dia não há feriado.');
  let sit;
  if (r.ferias) sit = 'Nesse dia, você está de férias.';
  else if (r.trabalhando) sit = /NOITE/.test(r.status) ? 'Nesse dia, você trabalha, no turno da noite.' : /MANH/.test(r.status) ? 'Nesse dia, você trabalha, no turno da manhã.' : 'Nesse dia, você trabalha.';
  else sit = 'Nesse dia, você está de folga.';
  const det = (r.detalhes || '').replace(/\s*·\s*/g, '. ').replace(/1x1/gi, 'um por um').replace(/^Região:\s*/i, 'Região ') + '.';
  return cab + ' ' + sit + ' ' + det;
}
function lerResultado() {
  if (!resultadoPesquisaAtual) { toast('Faça uma pesquisa primeiro.', 'aviso'); return; }
  falar(textoNaturalResultado(resultadoPesquisaAtual));
}
function testarVoz() {
  falar(obterGeneroVoz() === 'm'
    ? 'Olá! Esta é a voz masculina do Braun Online. Sua escala na palma da mão.'
    : 'Olá! Esta é a voz feminina do Braun Online. Sua escala na palma da mão.');
}
function definirGeneroVoz(g) {
  setStorageValue('braun_voz_genero', g);
  atualizarUIVoz(); testarVoz();
}
function rotuloVoz(v, i) {
  const uri = String(v.voiceURI || '');
  let cod = uri && uri !== v.name ? uri.replace(/^.*?-x-/i, '') : '';
  if (cod.length > 28) cod = cod.slice(0, 28) + '…';
  const gen = generoVoz(v) === 'f' ? ' ♀' : generoVoz(v) === 'm' ? ' ♂' : '';
  return (i + 1) + '. ' + v.name + (cod ? ' [' + cod + ']' : '') + (v.localService === false ? ' · online' : '') + gen;
}
function atualizarUIVoz() {
  const g = obterGeneroVoz();
  const f = document.getElementById('vozFem'), m = document.getElementById('vozMasc');
  if (f) f.setAttribute('aria-checked', g === 'f' ? 'true' : 'false');
  if (m) m.setAttribute('aria-checked', g === 'm' ? 'true' : 'false');
  const lista = vozesPt().sort(function (a, b) { return pontuarVoz(b) - pontuarVoz(a); });
  const sel = document.getElementById('vozEspecifica');
  if (sel) {
    const atual = getStorageValue('braun_voz_nome_' + g) || 'auto';
    sel.innerHTML = '';
    const o0 = document.createElement('option'); o0.value = 'auto'; o0.textContent = 'Automática'; sel.appendChild(o0);
    lista.forEach(function (v, i) {
      const o = document.createElement('option'); o.value = v.voiceURI; o.textContent = rotuloVoz(v, i);
      sel.appendChild(o);
    });
    sel.value = atual; if (sel.value !== atual) sel.value = 'auto';
  }
  const info = document.getElementById('vozInfo');
  if (info) {
    const e = escolherVoz(g);
    let t = e.voz ? 'Voz em uso: ' + e.voz.name + (e.tom !== 1 ? ' (tom ajustado)' : '') + '.' : 'Nenhuma voz em português encontrada neste aparelho.';
    if (lista.length <= 1) t += ' Este aparelho tem só 1 voz em português, então a masculina pode soar igual. Instale outra em Configurações > Conversão de texto em voz.';
    else t += ' ♀/♂ é um palpite pelo nome; escolha a voz na lista e ouça.';
    info.textContent = t;
  }
}

/* ============================================================
   23) CONQUISTAS
   ============================================================ */
const conquistas = {
  primeiro_passo: { id:'primeiro_passo', titulo:'Primeiro Passo', descricao:'Marcou a primeira cartilha como lida', icone:'&#127937;' },
  leitor_dedicado: { id:'leitor_dedicado', titulo:'Leitor Dedicado', descricao:'Leu 5 cartilhas', icone:'&#128218;' },
  expert_braun: { id:'expert_braun', titulo:'Expert Braun', descricao:'Completou todas as 10 cartilhas', icone:'&#127942;' },
  quiz_master: { id:'quiz_master', titulo:'Quiz Master', descricao:'Acertou 10 perguntas de quiz', icone:'&#127919;' }
};
const CONQ_ICO = { primeiro_passo:'flag', leitor_dedicado:'auto_stories', expert_braun:'workspace_premium', quiz_master:'target' };
function getConquistas() { return getJSON('braun_conquistas', []); }
function salvarConquista(id) {
  const l = getConquistas();
  if (l.indexOf(id) === -1) { l.push(id); setStorageValue('braun_conquistas', JSON.stringify(l)); mostrarConquistaDesbloqueada(id); }
}
function mostrarConquistaDesbloqueada(id) {
  const c = conquistas[id]; if (!c) return;
  const t = document.createElement('div');
  t.style.cssText = 'position:fixed;bottom:110px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#7030A0,#00A97A);color:white;padding:16px 24px;border-radius:20px;font-weight:800;box-shadow:0 10px 30px rgba(0,0,0,0.3);z-index:3000;display:flex;align-items:center;gap:12px;animation:bounceIn 0.6s cubic-bezier(0.68,-0.55,0.27,1.55);max-width:90%;';
  t.innerHTML = '<span class="pg-ico sm" style="background:rgba(255,255,255,0.22);"><span class="material-symbols-outlined" aria-hidden="true">' + (CONQ_ICO[id] || 'military_tech') + '</span></span><div><div style="font-size:0.75em;opacity:0.85;">CONQUISTA DESBLOQUEADA</div><div style="font-size:1.1em;">' + c.titulo + '</div></div>';
  document.body.appendChild(t);
  setTimeout(function () { t.style.opacity = '0'; t.style.transition = 'opacity 0.4s'; setTimeout(function () { t.remove(); }, 400); }, 3500);
}
function openConquistas() {
  closeHamburger();
  const l = getConquistas(), todas = Object.values(conquistas);
  const n = todas.filter(function (co) { return l.indexOf(co.id) > -1; }).length;
  const pct = Math.round((n / todas.length) * 100);
  document.getElementById('conqResumo').innerHTML =
    '<div class="ct-stats dois"><div class="ct-stat"><b>' + n + '/' + todas.length + '</b><span>Desbloqueadas</span></div><div class="ct-stat"><b>' + pct + '%</b><span>Progresso</span></div></div>' +
    '<div class="ct-barra" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '" aria-label="Progresso de conquistas"><i style="width:' + pct + '%"></i></div>';
  const c = document.getElementById('listaConquistas');
  c.innerHTML = todas.map(function (co) {
    const d = l.indexOf(co.id) > -1;
    return '<div class="pg-card' + (d ? '' : ' bloqueada') + '" style="align-items:center;">' +
      '<span class="pg-ico ' + (d ? 'roxo' : 'cinza') + '"><span class="material-symbols-outlined" aria-hidden="true">' + (CONQ_ICO[co.id] || 'military_tech') + '</span></span>' +
      '<div><h3>' + co.titulo + '</h3><p>' + co.descricao + '</p>' +
      '<span class="conq-status"><span class="material-symbols-outlined" aria-hidden="true">' + (d ? 'check_circle' : 'lock') + '</span>' + (d ? 'Desbloqueada' : 'Bloqueada') + '</span></div></div>';
  }).join('');
  focusModal('conquistasCard');
}

/* ============================================================
   24) EVENT BINDING
   ============================================================ */
const ACTION_MAP = {
  'go-greeting': goToGreeting,
  'voz-fem': function () { definirGeneroVoz('f'); },
  'voz-masc': function () { definirGeneroVoz('m'); },
  'testar-voz': testarVoz,
  'install-pwa': installPWA,
  'aplicar-atualizacao': aplicarAtualizacao,
  'dispensar-atualizacao': dispensarAtualizacao,
  'open-novidades': openNovidades,
  'open-pesquisa': openPesquisa,
  'mes-anterior': function () { mudarMes(-1); },
  'mes-proximo': function () { mudarMes(1); },
  'ir-hoje': irParaHoje,
  'close-drawer': closeHamburger,
  'open-perfil': openMeuPerfil,
  'open-ramais': function () { closeHamburger(); openRamais(); },
  'open-colaborador': openColaboradorDoMes,
  'open-pedidos': openMeusPedidos,
  'open-cartilhas': function () { cartilhaAtiva = null; ctQuiz = null; openCartilhas(); },
  'cartilha-lista': voltarBibliotecaCartilhas,
  'open-conquistas': openConquistas,
  'open-config': function () { closeHamburger(); openConfig(); },
  'toggle-dark': function () { toggleDarkMode(); closeHamburger(); },
  'open-privacy': function () { closeHamburger(); openPrivacy(); },
  'close-modals': closeAllModals,
  'marcar-novidades': marcarTodasNovidadesLidas,
  'copy-lote': copyLote,
  'save-nota': saveNota,
  'open-ferias': openFerias,
  'sugerir-ferias': sugerirFerias,
  'open-stats': openStats,
  'export-ics': exportarEscalaICS,
  'export-backup': exportarBackup,
  'import-backup': importarBackup,
  'save-ferias': saveFerias,
  'confirm-clear-ferias': confirmarClearFerias,
  'save-perfil-fechar': function () { salvarDadosPerfil(); closeAllModals(); },
  'votar': abrirFormularioVotacao,
  'votar-novamente': voltarAoVoto,
  'enviar-pedido': enviarPedidoEmail,
  'limpar-pedido': limparPedido,
  'mic': iniciarReconhecimentoVoz,
  'pesquisar': pesquisarData,
  'toggle-voz': toggleLerResultado,
  'fechar-pesquisa': fecharPesquisa
};
function bindAll() {
  document.addEventListener('click', function (e) {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const a = el.getAttribute('data-action');
    const f = ACTION_MAP[a];
    if (typeof f !== 'function') return;
    try { f(); } catch (err) {
      registrarErro('ação ' + a, err);
      toast('Não foi possível concluir essa ação. Tente novamente.', 'erro', 4000);
    }
  });
  document.querySelectorAll('.tab[data-region]').forEach(function (t) { t.addEventListener('click', function () { setRegion(t.dataset.region); }); });
  const tb = document.getElementById('turmaBadge');
  if (tb) {
    tb.addEventListener('click', openMeuPerfil);
    tb.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openMeuPerfil(); } });
  }
  const mb = document.getElementById('menuButton'); if (mb) mb.addEventListener('click', openHamburger);
  const do_ = document.getElementById('drawerOverlay'); if (do_) do_.addEventListener('click', closeHamburger);
  const ov = document.getElementById('overlay'); if (ov) ov.addEventListener('click', closeAllModals);
  const mg = document.getElementById('minimalGreetingToggle'); if (mg) mg.addEventListener('change', toggleMinimalGreeting);
  const vr = document.getElementById('voiceResponseToggle'); if (vr) vr.addEventListener('change', toggleVoiceResponse);
  const ve = document.getElementById('vozEspecifica'); if (ve) ve.addEventListener('change', function () { setStorageValue('braun_voz_nome_' + obterGeneroVoz(), ve.value); atualizarUIVoz(); testarVoz(); });
  if (window.speechSynthesis) { try { window.speechSynthesis.getVoices(); window.speechSynthesis.addEventListener('voiceschanged', atualizarUIVoz); } catch (e) {} }
  const tp = document.getElementById('turmaPerfil'); if (tp) tp.addEventListener('change', salvarDadosPerfil);
  const ap = document.getElementById('anoPerfil'); if (ap) ap.addEventListener('change', salvarDadosPerfil);
  const bf = document.getElementById('backupFileInput'); if (bf) bf.addEventListener('change', handleBackupFile);
  const pdt = document.getElementById('pesquisaDataTexto'); if (pdt) pdt.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); pesquisarData(); } });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { if (activeModalElement) closeAllModals(); else if (document.getElementById('hamburgerDrawer').classList.contains('open')) closeHamburger(); }
  });
  bindCalendarioDelegation();
}

/* ============================================================
   25) INIT
   ============================================================ */
(function init() {
  const st = getStorageValue('braun_turma_perfil');
  if (st) {
    let r, g;
    if (['A','B','C','D'].indexOf(st) > -1) { r = 'BR'; g = (st === 'A' || st === 'C') ? 'AC' : 'BD'; }
    else if (st.indexOf('1x1') === 0) { r = '1x1'; g = st; }
    else { r = 'MNT'; g = (st === 'E' || st === 'G') ? 'EG' : 'FH'; }
    currentRegion = r; currentTurma = g;
    setStorageValue('braun_last_region', r);
    setStorageValue('braun_turma_' + r, g);
  } else {
    const sr = getStorageValue('braun_last_region') || 'BR';
    currentRegion = sr;
    if (sr === '1x1') currentTurma = getStorageValue('braun_turma_1x1') || '1x1A';
    else currentTurma = getStorageValue('braun_turma_' + sr) || (sr === 'BR' ? 'AC' : 'EG');
  }
  document.querySelectorAll('.tab').forEach(function (t) { t.classList.remove('active'); });
  const at = document.getElementById('tab-' + currentRegion);
  if (at) { at.classList.add('active'); at.setAttribute('aria-selected', 'true'); }
})();

safeRun('boasVindas', boasVindas);

// Inicialização não depende mais do evento 'load' (que espera TODOS os recursos: imagens, fontes...).
// Como o app.js é defer, o DOM já está pronto aqui; 'load' fica só como reserva.
var appIniciado = false;
function iniciarApp() {
  if (appIniciado) return;
  appIniciado = true;
  aplicarModoFeriados();
  safeRun('prepararModais', prepararModais);
  safeRun('bindCartilhas', bindCartilhas);
  safeRun('prepararRamais', prepararRamais);
  safeRun('offsetCalendario', function () {
    atualizarOffsetCalendario();
    window.addEventListener('resize', atualizarOffsetCalendario);
    const sb = document.querySelector('.sticky-header-block');
    if (sb && window.ResizeObserver) new ResizeObserver(atualizarOffsetCalendario).observe(sb);
  });
  safeRun('boasVindas', boasVindas);
  safeRun('bindAll', bindAll);
  safeRun('startClock', startClock);
  safeRun('tick', tick);
  safeRun('atualizarLegenda1x1', atualizarLegenda1x1);
  safeRun('gerarCalendario', gerarCalendario);
  safeRun('atualizarBadgeTurma', atualizarBadgeTurma);
  safeRun('preencherDadosModais', preencherDadosModais);
  safeRun('atualizarNovidadesUI', atualizarNovidadesUI);
  safeRun('atualizarTituloMes', atualizarTituloMes);
  safeRun('atualizarBannerAvisos', atualizarBannerAvisos);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciarApp);
else iniciarApp();
window.addEventListener('load', iniciarApp);