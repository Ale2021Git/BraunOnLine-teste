/* Braun OnLine — app.js
 * Versão 3.11 · 2026/2027
 */
'use strict';

/* ============================================================
   0) CONFIGURAÇÕES EDITÁVEIS
   ============================================================ */
const EMAIL_PEDIDOS = 'braun.online.app@gmail.com';

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
  'braun_minimal_greeting','braun_voice_response','braun_haptic',
  'braun_cartilhas_lidas','braun_conquistas','braun_quizzes_acertados',
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
function focusModal(modalId) {
  const overlay = document.getElementById('overlay');
  const modal = document.getElementById(modalId);
  if (!modal) return;
  lastFocusedElement = document.activeElement;
  overlay.style.display = 'block';
  modal.classList.add('show');
  const main = document.getElementById('main-content');
  const header = document.querySelector('header');
  if (main) main.setAttribute('aria-hidden', 'true');
  if (header) header.setAttribute('aria-hidden', 'true');
  if (activeModalElement) document.removeEventListener('keydown', trapFocus);
  activeModalElement = modal;
  document.addEventListener('keydown', trapFocus);
  const first = modal.querySelector(FOCUSABLE);
  if (first) setTimeout(function () { first.focus(); }, 50);
}
function closeAllModals() {
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
      msg.innerText = s; msg.style.color = 'var(--primary)';
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
if (getStorageValue('braun_update_pending') === 'true') {
  window.addEventListener('load', function () {
    setTimeout(function () { mostrarBannerAtualizacao(); removeStorageValue('braun_update_pending'); }, 1500);
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
function gerarCalendario() {
  const box = document.getElementById('calendario-box');
  box.innerHTML = '';
  const mg = ++calendarioGeracao;
  let cm = 0; const total = 12; const ano = anoAtualVisivel;
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
    let hF = '<div class="mes-face mes-front"><div style="display:flex;justify-content:space-between;align-items:center;margin:5px 10px 0 10px;"><span style="color:var(--primary);font-weight:800;text-transform:capitalize;font-size:1.1em;">' + nomeM + '</span><span style="color:var(--primary);font-weight:800;font-size:1.1em;">' + ano + '</span></div><div class="grid"><div class="dia-label">W</div>' + lang.days.map(function (s) { return '<div class="dia-label">' + s + '</div>'; }).join('');
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
      if (hojeStr === at.toDateString()) cls += 'hoje ';
      if (nt) cls += 'HAS_NOTE ';
      if (isFerias(at)) { cls += 'FERIAS '; sh = 'em férias'; }
      const isRetorno = (retornoStr && at.toDateString() === retornoStr);
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
      const al = d + ' de ' + nomeM + ' de ' + ano + ', ' + sh + (f ? ', feriado: ' + f : '') + (nt ? ', com anotação' : '') + '. Toque para ver detalhes.';
      hF += '<div class="' + cls.trim() + '" data-iso="' + isoF + '" role="button" tabindex="0" aria-label="' + escapeHtml(al) + '">' + d + '</div>';
      col++;
    }
    hF += '</div></div>';
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
  const ck = ano + '_' + turma + '_' + currentRegion;
  if (cachedStats[ck]) { document.getElementById('stats-content').innerHTML = cachedStats[ck]; document.getElementById('configCard').classList.remove('show'); focusModal('statsCard'); return; }
  const feriados = getFeriados(ano);
  let dt = 0, df = 0, ft = 0, ff = 0, lfh = '';
  for (let m = 0; m < 12; m++) {
    for (let d = 1; d <= new Date(ano, m + 1, 0).getDate(); d++) {
      const dTeste = new Date(ano, m, d);
      const isoS = String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
      const res = isTrabalhando(dTeste, currentRegion, turma);
      if (res) dt++; else df++;
      if (feriados[isoS]) {
        if (res) ft++; else ff++;
        lfh += '<div>' + feriados[isoS] + ' (' + (res ? 'TRABALHA' : 'FOLGA') + ')</div>';
      }
    }
  }
  const html = '<div class="stat-grid"><div class="stat-card-big purple"><div class="stat-val-big purple">' + dt + '</div><div class="stat-lab-big">Dias Trabalhados</div></div><div class="stat-card-big teal"><div class="stat-val-big teal">' + df + '</div><div class="stat-lab-big">Dias de Folga</div></div></div><div style="background:var(--bg);border-radius:15px;padding:15px;border:1px solid var(--border);margin-top:10px;"><div style="display:flex;justify-content:space-between;font-weight:800;margin-bottom:5px;"><span>Feriados trabalhados</span><span style="color:var(--accent);">' + ft + '</span></div><div style="display:flex;justify-content:space-between;font-weight:800;margin-bottom:5px;"><span>Feriados de folga</span><span style="color:var(--verde);">' + ff + '</span></div>' + (lfh ? '<div style="margin-top:12px;border-top:1px solid var(--border);padding-top:12px;font-size:0.85em;">' + lfh + '</div>' : '') + '</div>';
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
  window.location.href = 'mailto:' + EMAIL_PEDIDOS + '?subject=' + encodeURIComponent(a) + '&body=' + encodeURIComponent(c);
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
function renderSugestoesFerias(sug, duracao) {
  const container = document.getElementById('sugestoesFerias');
  if (!sug.length) {
    container.innerHTML = '<p style="font-size:0.85em;opacity:0.6;text-align:center;">Sem sugestões para esse mês.</p>';
    return;
  }
  const nomeDia = ['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'];
  let html = '<div style="font-size:0.82em;opacity:0.7;margin-bottom:10px;">Toque numa opção para preencher as datas:</div>';
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
    const b = s.ganho > 0
      ? '<span style="background:var(--verde);color:white;padding:3px 10px;border-radius:20px;font-size:0.75em;font-weight:800;">+' + s.ganho + ' dia' + (s.ganho > 1 ? 's' : '') + '</span>'
      : '<span style="background:var(--border);color:var(--text);padding:3px 10px;border-radius:20px;font-size:0.75em;font-weight:800;opacity:0.6;">sem ganho</span>';
    const est = i === 0 ? ' ⭐' : '';
    html += '<div data-sugestao-ini="' + s.S.toISOString().split('T')[0] + '" data-sugestao-fim="' + s.E.toISOString().split('T')[0] + '" class="sugestao-ferias-item" style="background:var(--bg);border:1.5px solid ' + (i === 0 ? 'var(--primary)' : 'var(--border)') + ';border-radius:16px;padding:14px;margin-bottom:10px;cursor:pointer;transition:0.2s;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">' +
      '<div style="font-weight:800;font-size:0.95em;">' + iniF + ' → ' + fimF + est + '</div>' +
      b +
      '</div>' +
      '<div style="font-size:0.8em;opacity:0.75;margin-top:6px;">Você ficará <strong>' + s.homeDays + ' dias em casa</strong> consecutivos.</div>' +
      '<div style="font-size:0.82em;margin-top:6px;padding-top:6px;border-top:1px solid var(--border);display:flex;align-items:center;gap:6px;color:var(--accent);font-weight:700;">' +
      '<span class="material-symbols-outlined" style="font-size:16px;">work</span>' +
      'Retorno: <strong>' + retornoF + '</strong> (' + retornoDia + ')</div>' +
      '</div>';
  });
  container.innerHTML = html;
  container.querySelectorAll('.sugestao-ferias-item').forEach(function (el) {
    el.addEventListener('click', function () {
      document.getElementById('feriasInicio').value = el.dataset.sugestaoIni;
      document.getElementById('feriasFim').value = el.dataset.sugestaoFim;
      toast('Datas preenchidas! Toque em SALVAR PERÍODO.', 'sucesso', 2500);
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  });
}

/* ============================================================
   18) DARK MODE + NAV
   ============================================================ */
function toggleDarkMode() { document.documentElement.classList.toggle('dark-mode'); setStorageValue('braun_dark_mode', document.documentElement.classList.contains('dark-mode')); }
function toggleMinimalGreeting() { setStorageValue('braun_minimal_greeting', document.getElementById('minimalGreetingToggle').checked ? 'true' : 'false'); tick(); }
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
function scrollParaMes(mes, ano) {
  let c = document.querySelector('.mes-container[data-mes="' + mes + '"][data-ano="' + ano + '"]');
  if (!c) {
    currentAno = ano; setStorageValue('braun_ano', String(currentAno));
    _escalaCache.clear(); gerarCalendario();
    setTimeout(function () {
      c = document.querySelector('.mes-container[data-mes="' + mes + '"][data-ano="' + ano + '"]');
      if (c) {
        const h = document.querySelector('header'), sb = document.querySelector('.sticky-header-block');
        const tO = (h ? h.offsetHeight : 0) + (sb ? sb.offsetHeight : 0) + 20;
        const r = c.getBoundingClientRect();
        window.scrollTo({ top: Math.max(0, window.scrollY + r.top - tO), behavior: 'smooth' });
      }
    }, 200); return;
  }
  const h = document.querySelector('header'), sb = document.querySelector('.sticky-header-block');
  const tO = (h ? h.offsetHeight : 0) + (sb ? sb.offsetHeight : 0) + 20;
  const r = c.getBoundingClientRect();
  window.scrollTo({ top: Math.max(0, window.scrollY + r.top - tO), behavior: 'smooth' });
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
function goToGreeting() {
  const w = document.getElementById('welcomeScreen');
  w.classList.add('hide');
  setTimeout(function () { w.style.display = 'none'; setStorageValue('braun_visited', 'true'); scrollToToday(); }, 500);
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
  { id:'comousar', icone:'help', titulo:'Como usar o Braun OnLine', conteudo:'<p>Bem-vindo ao <strong>Braun OnLine</strong>! Este guia rápido mostra tudo.</p><div class="cartilha-destaque"><strong>📅 Ver sua escala</strong><br>Dias coloridos mostram sua escala. Use as abas no rodapé para alternar entre <b>ECOFLAC</b>, <b>MANUT.</b> e <b>1x1</b>.</div><div class="cartilha-destaque"><strong>✏️ Anotações</strong><br>Toque em qualquer dia para escrever um lembrete.</div><div class="cartilha-destaque"><strong>🏖️ Programar férias</strong><br>Use a ferramenta de <b>Sugestão</b> para descobrir as datas que rendem mais dias em casa!</div><div class="cartilha-destaque"><strong>📦 Meus Pedidos</strong><br>Menu ☰ → Meus Pedidos. Preencha quantidade e tamanho, envie por e-mail.</div><div class="cartilha-destaque"><strong>💾 Backup</strong><br>Menu ☰ → Configurações → Exportar Backup (JSON).</div><p><strong>Dica:</strong> Sempre que aparecer um banner roxo, toque em <b>Atualizar</b>.</p>', quiz:[{pergunta:'Como você faz backup?',opcoes:['Tocando no calendário','Menu ☰ → Configurações → Exportar Backup','Reiniciando','Falando com supervisor'],certa:1},{pergunta:'Onde programa férias?',opcoes:['Nas Cartilhas','No Meu Perfil','No menu ☰ → Configurações','Não dá'],certa:2},{pergunta:'O que fazer quando aparecer banner roxo?',opcoes:['Ignorar','Tocar em Atualizar','Desinstalar','Reiniciar'],certa:1}] },
  { id:'kaizen', icone:'trending_up', titulo:'Kaizen – Melhoria Contínua', conteudo:'<p><strong>Kaizen</strong> significa "mudança para melhor". Pequenas melhorias diárias de todos.</p><div class="cartilha-destaque"><strong>Princípios:</strong><br> • Eliminar desperdícios<br> • Padronizar processos<br> • Envolver todos<br> • Focar em dados</div>', quiz:[{pergunta:'O que significa Kaizen?',opcoes:['Grande revolução','Mudança para melhor','Padronização','Controle'],certa:1},{pergunta:'Um princípio do Kaizen:',opcoes:['Grandes mudanças','Eliminar desperdícios','Centralizar','Ignorar dados'],certa:1},{pergunta:'Kaizen busca melhorias:',opcoes:['Na produção','Na gestão','Pequenas e diárias','Em crises'],certa:2}] },
  { id:'5s', icone:'cleaning_services', titulo:'Os 5S – Organização', conteudo:'<p>Os <strong>5S</strong> organizam o ambiente de trabalho.</p><div class="cartilha-destaque"><b>1. Seiri:</b> Separar o útil.<br><b>2. Seiton:</b> Organizar.<br><b>3. Seiso:</b> Limpar.<br><b>4. Seiketsu:</b> Padronizar.<br><b>5. Shitsuke:</b> Disciplina.</div>', quiz:[{pergunta:'Quantos sensos?',opcoes:['3','5','7','10'],certa:1},{pergunta:'Seiri é:',opcoes:['Limpar','Organizar','Separar útil do inútil','Criar padrões'],certa:2},{pergunta:'Disciplina:',opcoes:['Seiso','Seiketsu','Shitsuke','Seiton'],certa:2}] },
  { id:'pdca', icone:'cycle', titulo:'PDCA – Planejar, Fazer, Checar, Agir', conteudo:'<p>O <strong>PDCA</strong> estrutura melhorias.</p><div class="cartilha-destaque"><b>P:</b> Definir metas.<br><b>D:</b> Executar.<br><b>C:</b> Verificar.<br><b>A:</b> Padronizar.</div>', quiz:[{pergunta:'PDCA significa?',opcoes:['Planejar, Definir, Controlar, Aplicar','Planejar, Fazer, Checar, Agir','Produzir, Distribuir','Padronizar, Dirigir'],certa:1},{pergunta:'Na etapa C?',opcoes:['Executar','Verificar resultados','Padronizar','Definir metas'],certa:1},{pergunta:'PDCA é ciclo:',opcoes:['Linear','Contínuo','Para gestores','Só produção'],certa:1}] },
  { id:'ferramentas', icone:'build', titulo:'Ferramentas da Qualidade', conteudo:'<p>Ferramentas para resolver problemas.</p><div class="cartilha-destaque"> • <b>Ishikawa</b> – causas raiz.<br> • <b>5 Porquês</b>.<br> • <b>Fluxograma</b>.<br> • <b>Pareto</b> – prioriza.</div>', quiz:[{pergunta:'Causas raiz:',opcoes:['Pareto','Ishikawa','Fluxograma','5 Porquês'],certa:1},{pergunta:'Ishikawa também é:',opcoes:['Causa e Efeito','Pareto','Controle','Fluxograma'],certa:0},{pergunta:'Priorizar problemas:',opcoes:['5 Porquês','Fluxograma','Pareto','Ishikawa'],certa:2}] },
  { id:'seguranca', icone:'security', titulo:'Segurança do Trabalho', conteudo:'<p>Segurança é prioridade.</p><div class="cartilha-destaque"> • Usar <b>EPIs</b>.<br> • 5S.<br> • Emergência.<br> • Reportar riscos.</div>', quiz:[{pergunta:'Primeira ação ao risco?',opcoes:['Ignorar','Sinalizar','Continuar','Aguardar'],certa:1},{pergunta:'EPI é:',opcoes:['Proteção Individual','Produção Interna','Proteção Integrada','Preventivo Industrial'],certa:0},{pergunta:'Emergência:',opcoes:['Correr','Seguir plano','Aguardar','Filmar'],certa:1}] },
  { id:'bpf', icone:'medication', titulo:'Boas Práticas de Fabricação', conteudo:'<p>As <strong>BPF</strong> garantem qualidade na indústria farmacêutica.</p><div class="cartilha-destaque"> • Higiene.<br> • Controle de processos.<br> • Rastreabilidade.<br> • Documentação.</div>', quiz:[{pergunta:'BPF garantem?',opcoes:['Produtividade','Qualidade','Custos','Vendas'],certa:1},{pergunta:'Princípio:',opcoes:['Qualquer roupa','Não registrar','Higiene pessoal','Sem supervisão'],certa:2},{pergunta:'Rastreabilidade:',opcoes:['Velocidade','Origem do lote','Menos pessoas','Sem doc'],certa:1}] },
  { id:'sustentabilidade', icone:'eco', titulo:'Sustentabilidade', conteudo:'<p>A Braun apoia a sustentabilidade.</p><div class="cartilha-destaque"> • Energia.<br> • Água.<br> • Reciclar.<br> • Menos impressão.</div>', quiz:[{pergunta:'Contribui:',opcoes:['Luzes acesas','Resíduos corretos','Água excessiva','Imprimir'],certa:1},{pergunta:'Reduzir beneficia:',opcoes:['Ambiente','Empresa','Todos','Ninguém'],certa:2},{pergunta:'NÃO é sustentável:',opcoes:['Desligar','Reciclar','Torneira pingando','Reutilizar papel'],certa:2}] },
  { id:'compliance', icone:'gavel', titulo:'Compliance – Ética', conteudo:'<p><strong>Compliance</strong> é agir com ética.</p><div class="cartilha-destaque"> • Código de Conduta.<br> • Conflito de Interesses.<br> • Anticorrupção.<br> • LGPD.<br> • Canal de Denúncia.</div>', quiz:[{pergunta:'Compliance é?',opcoes:['Cargo','Regras éticas','Treinamento','Ferramenta'],certa:1},{pergunta:'Presente de fornecedor:',opcoes:['Aceitar','Recusar e reportar','Aceitar pequeno','Dividir'],certa:1},{pergunta:'Quem segue?',opcoes:['Diretoria','RH','Todos','Fornecedores'],certa:2}] },
  { id:'incendio', icone:'local_fire_department', titulo:'Prevenção de Incêndios', conteudo:'<p>Riscos elevados em indústria farmacêutica.</p><div class="cartilha-destaque"><b>Classes:</b><br> • A – sólidos<br> • B – líquidos<br> • C – elétricos (NUNCA água)<br> • D – metais<br> • K – gorduras</div><div class="cartilha-exemplo"><b>PASS:</b> Puxar, Apontar, Apertar, Varrer.</div>', quiz:[{pergunta:'Classe C (elétrico) NUNCA:',opcoes:['CO₂','Pó','Água','Pó Especial'],certa:2},{pergunta:'PASS significa?',opcoes:['Puxar, Apontar, Apertar, Varrer','Parar, Avaliar','Prevenir, Atuar','Pegar, Arremessar'],certa:0},{pergunta:'Área estéril:',opcoes:['Pó','Água','CO₂','Espuma'],certa:2}] }
];

let cartilhaAtiva = 'comousar';
let cartilhasLidas = getJSON('braun_cartilhas_lidas', []);

function openCartilhas() { closeHamburger(); renderCartilhas(); focusModal('cartilhasCard'); }
function renderCartilhas() {
  const tc = document.getElementById('cartilhaTabs'), pc = document.getElementById('cartilhaPanels');
  tc.innerHTML = ''; pc.innerHTML = '';
  const sorted = cartilhasData.slice().sort(function (a, b) {
    const al = cartilhasLidas.indexOf(a.id) > -1 ? 1 : 0;
    const bl = cartilhasLidas.indexOf(b.id) > -1 ? 1 : 0;
    return al - bl;
  });
  sorted.forEach(function (cart) {
    const isA = cart.id === cartilhaAtiva;
    const estaL = cartilhasLidas.indexOf(cart.id) > -1;
    const btn = document.createElement('button');
    btn.className = 'cartilha-tab-btn' + (isA ? ' active' : '') + (estaL ? ' lida' : '');
    const tc2 = cart.titulo.split('–')[0].trim() || cart.titulo;
    btn.innerHTML = '<span class="material-symbols-outlined">' + cart.icone + '</span> ' + tc2;
    btn.addEventListener('click', function () { cartilhaAtiva = cart.id; renderCartilhas(); });
    tc.appendChild(btn);
    const p = document.createElement('div');
    p.className = 'cartilha-panel' + (isA ? ' active' : '');
    p.id = 'panel-' + cart.id;
    let qh = '';
    cart.quiz.forEach(function (q, qi) {
      let oh = '';
      q.opcoes.forEach(function (op, oi) {
        oh += '<div class="quiz-opcao" data-cart="' + cart.id + '" data-q="' + qi + '" data-o="' + oi + '" role="button" tabindex="0">' + op + '</div>';
      });
      qh += '<div class="quiz-pergunta">' + (qi + 1) + '. ' + q.pergunta + '</div><div class="quiz-opcoes" id="quiz-' + cart.id + '-' + qi + '">' + oh + '</div><div class="quiz-feedback" id="feedback-' + cart.id + '-' + qi + '"></div>';
    });
    p.innerHTML = '<div class="cartilha-titulo">' + (cart.icone ? '<span class="material-symbols-outlined" style="font-size:28px;vertical-align:middle;">' + cart.icone + '</span> ' : '') + cart.titulo + '</div><div class="cartilha-conteudo">' + cart.conteudo + '</div><button class="cartilha-btn-marcar ' + (estaL ? 'marcado' : '') + '" data-cart-id="' + cart.id + '"><span class="material-symbols-outlined">' + (estaL ? 'check_circle' : 'circle') + '</span> ' + (estaL ? 'MARCADA COMO LIDA' : 'MARCAR COMO LIDA') + '</button><div class="cartilha-quiz"><h4>&#128221; Teste seu conhecimento</h4>' + qh + '</div>';
    pc.appendChild(p);
  });
  pc.querySelectorAll('.cartilha-btn-marcar').forEach(function (b) { b.addEventListener('click', function () { toggleCartilhaLida(b.dataset.cartId); }); });
  pc.querySelectorAll('.quiz-opcao').forEach(function (el) {
    const h = function () { responderQuiz(el.dataset.cart, parseInt(el.dataset.q), parseInt(el.dataset.o)); };
    el.addEventListener('click', h);
    el.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); h(); } });
  });
  atualizarProgresso();
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
  renderCartilhas(); atualizarNovidadesUI();
}
function atualizarProgresso() {
  const t = cartilhasData.length, l = cartilhasLidas.length, p = Math.round((l / t) * 100);
  document.getElementById('progressoFill').style.width = p + '%';
  document.getElementById('progressoTexto').innerText = l + '/' + t;
}
let quizzesAcertados = parseInt(getStorageValue('braun_quizzes_acertados') || '0', 10) || 0;
function responderQuiz(cid, qi, oi) {
  const c = cartilhasData.find(function (x) { return x.id === cid; }); if (!c) return;
  const q = c.quiz[qi];
  const od = document.getElementById('quiz-' + cid + '-' + qi);
  const fb = document.getElementById('feedback-' + cid + '-' + qi);
  if (od.querySelector('.desabilitada')) return;
  od.querySelectorAll('.quiz-opcao').forEach(function (e) { e.classList.add('desabilitada'); });
  od.querySelectorAll('.quiz-opcao').forEach(function (e, i) {
    if (i === q.certa) e.classList.add('certa');
    else if (i === oi && oi !== q.certa) e.classList.add('errada');
  });
  if (oi === q.certa) {
    fb.innerHTML = '&#9989; Correto!'; fb.className = 'quiz-feedback certo';
    quizzesAcertados++; setStorageValue('braun_quizzes_acertados', quizzesAcertados);
    if (quizzesAcertados === 10) salvarConquista('quiz_master');
  } else { fb.innerHTML = '&#10060; Incorreto. A resposta certa é: ' + q.opcoes[q.certa]; fb.className = 'quiz-feedback errado'; }
}

/* ============================================================
   21) NOVIDADES
   ============================================================ */
const novidadesData = [
  { id:'nov23', titulo:'🗳️ Votação do Colaborador do Mês melhorada', descricao:'Agora o formulário de votação é preenchido automaticamente com seus dados. Digite apenas o nome do colega que você quer votar.', data:'2026-10-02', cartilhaId:null },
  { id:'nov22', titulo:'🏖️ Sugestão inteligente de férias!', descricao:'Agora o app te ajuda a escolher a MELHOR data para suas férias. Você escolhe o mês e a quantidade de dias, e ele mostra as datas que rendem mais dias em casa respeitando sua escala. Acesse: Configurações → Programar Férias.', data:'2026-10-01', cartilhaId:'comousar' },
  { id:'nov20', titulo:'🌞 Saudação Minimalista funcionando', descricao:'Agora o toggle "Saudação Minimalista" realmente funciona. Mostra apenas "Bom dia / Boa tarde / Boa noite".', data:'2026-10-01', cartilhaId:null },
  { id:'nov19', titulo:'📦 Meus Pedidos reformulado!', descricao:'Agora você preenche a quantidade e o tamanho de cada item. O pedido vai direto por e-mail.', data:'2026-09-30', cartilhaId:null },
  { id:'nov18', titulo:'📘 Nova Cartilha: Como usar o Braun OnLine', descricao:'Guia rápido com tudo o que você precisa saber.', data:'2026-09-28', cartilhaId:'comousar' },
  { id:'nov17', titulo:'🔒 Backup e Restauração', descricao:'Exporte e importe todos os seus dados em JSON.', data:'2026-09-27', cartilhaId:null },
  { id:'nov5', titulo:'🧯 Nova Cartilha: Prevenção de Incêndios', descricao:'Aprenda sobre classes de incêndio e método PASS.', data:'2026-07-05', cartilhaId:'incendio' },
  { id:'nov1', titulo:'📘 Nova Cartilha: Compliance', descricao:'Ética, Código de Conduta, LGPD e Canal de Denúncia.', data:'2026-07-04', cartilhaId:'compliance' }
];
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
    if (nov.cartilhaId) lh = '<span class="link-cartilha" data-cart="' + nov.cartilhaId + '">Abrir cartilha &rarr;</span>';
    card.innerHTML = '<div class="novidade-titulo">' + nov.titulo + ' ' + b + '</div><div class="novidade-desc">' + nov.descricao + '</div>' + lh + '<span class="novidade-data">' + formatarData(nov.data) + '</span>';
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
function abrirCartilhaPorId(id) { closeAllModals(); cartilhaAtiva = id; openCartilhas(); }

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
  if (!do_ || isNaN(do_.getTime())) { rd.innerHTML = '&#10060; Data inválida.'; dd.innerText = 'Use dd/mm/aaaa.'; resultadoPesquisaAtual = null; atualizarBotaoOuvir(); return; }
  const r = currentRegion, t = currentTurma;
  const trab = isTrabalhando(do_, r, t), fer = isFerias(do_);
  let st, cor, ih, det;
  const rn = nomeRegiao(r), tf = formatarTurmaParaVoz(t);
  if (r === '1x1') det = 'Região: Escala ' + tf; else det = 'Região: ' + rn + ' · Turmas ' + tf;
  if (fer) { st = 'EM FÉRIAS'; cor = 'var(--ferias)'; ih = '<span class="icone-ferias">&#9992;&#65039;</span>'; }
  else if (trab) {
    if (r === '1x1') st = isTurnoNoite1x1(t) ? 'TRABALHANDO (NOITE)' : 'TRABALHANDO (MANHÃ)'; else st = 'TRABALHANDO';
    cor = r === '1x1' && isTurnoNoite1x1(t) ? 'var(--roxo-1x1)' : 'var(--accent)';
    ih = '<span class="icone-trabalho">&#9881;&#65039;</span>';
  } else { st = 'DE FOLGA'; cor = 'var(--primary)'; ih = '<span class="icone-folga">&#127754;</span>'; }
  rd.style.color = cor;
  rd.innerHTML = ih + '<div><strong>' + diaDaSemanaPorExtenso(do_) + ', ' + do_.toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' }) + '</strong></div><div style="font-size:1.1em;">' + st + '</div>';
  dd.innerText = det;
  resultadoPesquisaAtual = { data: do_, status: st, detalhes: det, ferias: fer, trabalhando: trab };
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
function lerResultado() {
  if (!resultadoPesquisaAtual) { toast('Faça uma pesquisa primeiro.', 'aviso'); return; }
  const v = new SpeechSynthesisUtterance();
  v.lang = 'pt-BR'; v.rate = 1.1;
  const do_ = resultadoPesquisaAtual.data;
  v.text = diaDaSemanaPorExtenso(do_) + ', ' + do_.toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' }) + '. ' + resultadoPesquisaAtual.status + '. ' + resultadoPesquisaAtual.detalhes + '.';
  v.onend = atualizarBotaoOuvir; v.onerror = atualizarBotaoOuvir;
  if (window.speechSynthesis) { window.speechSynthesis.cancel(); window.speechSynthesis.speak(v); setTimeout(atualizarBotaoOuvir, 100); }
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
function getConquistas() { return getJSON('braun_conquistas', []); }
function salvarConquista(id) {
  const l = getConquistas();
  if (l.indexOf(id) === -1) { l.push(id); setStorageValue('braun_conquistas', JSON.stringify(l)); mostrarConquistaDesbloqueada(id); }
}
function mostrarConquistaDesbloqueada(id) {
  const c = conquistas[id]; if (!c) return;
  const t = document.createElement('div');
  t.style.cssText = 'position:fixed;bottom:110px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#7030A0,#00A97A);color:white;padding:16px 24px;border-radius:20px;font-weight:800;box-shadow:0 10px 30px rgba(0,0,0,0.3);z-index:3000;display:flex;align-items:center;gap:12px;animation:bounceIn 0.6s cubic-bezier(0.68,-0.55,0.27,1.55);max-width:90%;';
  t.innerHTML = '<span style="font-size:2em;">' + c.icone + '</span><div><div style="font-size:0.75em;opacity:0.85;">CONQUISTA DESBLOQUEADA</div><div style="font-size:1.1em;">' + c.titulo + '</div></div>';
  document.body.appendChild(t);
  setTimeout(function () { t.style.opacity = '0'; t.style.transition = 'opacity 0.4s'; setTimeout(function () { t.remove(); }, 400); }, 3500);
}
function openConquistas() {
  closeHamburger();
  const l = getConquistas();
  const c = document.getElementById('listaConquistas');
  c.innerHTML = '';
  Object.values(conquistas).forEach(function (co) {
    const d = l.indexOf(co.id) > -1;
    const card = document.createElement('div');
    card.style.cssText = 'background:var(--bg);border-radius:16px;padding:16px;border:1px solid var(--border);display:flex;align-items:center;gap:14px;opacity:' + (d?'1':'0.45') + ';';
    card.innerHTML = '<div style="font-size:2.2em;">' + co.icone + '</div><div><div style="font-weight:800;font-size:1.05em;">' + co.titulo + '</div><div style="font-size:0.85em;opacity:0.7;">' + co.descricao + '</div>' + (d?'<div style="font-size:0.75em;color:var(--primary);font-weight:700;margin-top:4px;">&#10003; Desbloqueada</div>':'<div style="font-size:0.75em;opacity:0.5;margin-top:4px;">Bloqueada</div>') + '</div>';
    c.appendChild(card);
  });
  focusModal('conquistasCard');
}

/* ============================================================
   24) EVENT BINDING
   ============================================================ */
const ACTION_MAP = {
  'go-greeting': goToGreeting,
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
  'open-cartilhas': openCartilhas,
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

window.addEventListener('load', function () {
  const v = getStorageValue('braun_visited');
  const w = document.getElementById('welcomeScreen');
  w.style.display = v ? 'none' : 'flex';
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
});