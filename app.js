/* Braun OnLine — app.js
 * Versão 3.11 · 2026/2027
 * Carregado com <script defer>
 */
'use strict';

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
function haptic(ms) {
  ms = ms || 10;
  if (getStorageValue('braun_haptic') === 'false') return;
  if (navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} }
}

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
  el.innerHTML = '<span class="material-symbols-outlined">' + (icones[tipo] || 'info') + '</span>' +
                 '<div class="toast-msg">' + escapeHtml(mensagem) + '</div>';
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
  el.innerHTML = '<span class="material-symbols-outlined">help</span>' +
    '<div style="flex:1;"><div class="toast-msg">' + escapeHtml(mensagem) + '</div>' +
    '<div class="toast-actions">' +
    '<button data-action="ok">Confirmar</button>' +
    '<button data-action="cancel" class="secundario">Cancelar</button>' +
    '</div></div>';
  el.querySelector('[data-action="ok"]').addEventListener('click', function () {
    el.remove(); onConfirm(true);
  });
  el.querySelector('[data-action="cancel"]').addEventListener('click', function () {
    el.remove(); onConfirm(false);
  });
  container.appendChild(el);
  setTimeout(function () { if (el.parentNode) el.remove(); }, 8000);
}

/* ============================================================
   5) CACHE LRU
   ============================================================ */
function LRUCache(max) {
  this.max = max || 800;
  this.map = new Map();
}
LRUCache.prototype.get = function (key) {
  if (!this.map.has(key)) return undefined;
  var v = this.map.get(key);
  this.map.delete(key); this.map.set(key, v);
  return v;
};
LRUCache.prototype.set = function (key, value) {
  if (this.map.has(key)) this.map.delete(key);
  this.map.set(key, value);
  if (this.map.size > this.max) {
    var firstKey = this.map.keys().next().value;
    this.map.delete(firstKey);
  }
};
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
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const isTab = e.key === 'Tab' || e.keyCode === 9;
  if (!isTab) return;
  if (e.shiftKey) {
    if (document.activeElement === first) { e.preventDefault(); last.focus(); }
  } else {
    if (document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
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
  if (lastFocusedElement && lastFocusedElement.focus) {
    lastFocusedElement.focus();
    lastFocusedElement = null;
  }
}

/* ============================================================
   7) CACHES E FERIADOS
   ============================================================ */
let cachedFerias = null;
function getFeriasRange() {
  if (cachedFerias) return cachedFerias;
  cachedFerias = {
    inicio: getStorageValue('braun_ferias_inicio'),
    fim: getStorageValue('braun_ferias_fim')
  };
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
    '01-01': 'Ano Novo',
    '04-21': 'Tiradentes',
    '04-23': 'São Jorge',
    '05-01': 'Dia do Trabalho',
    '09-07': 'Independência',
    '09-22': 'Aniv. São Gonçalo',
    '10-12': 'N. S. Aparecida',
    '11-02': 'Finados',
    '11-15': 'Proclamação da República',
    '12-25': 'Natal'
  };
  const pascoa = calculaPascoa(ano);
  const carnaval = new Date(pascoa.getTime() - (47 * 86400000));
  const sextaSanta = new Date(pascoa.getTime() - (2 * 86400000));
  const chaveCarnaval = String(carnaval.getMonth() + 1).padStart(2, '0') + '-' + String(carnaval.getDate()).padStart(2, '0');
  const chaveSexta = String(sextaSanta.getMonth() + 1).padStart(2, '0') + '-' + String(sextaSanta.getDate()).padStart(2, '0');
  if (!f[chaveCarnaval]) f[chaveCarnaval] = 'Carnaval';
  if (!f[chaveSexta]) f[chaveSexta] = 'Sexta-Feira Santa';
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
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
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
  const key = 'BR_' + dt.getFullYear() + '_' + dt.getMonth() + '_' + dt.getDate() + '_' + t;
  let v = _escalaCache.get(key);
  if (v !== undefined) return v;
  const cfg = ESCALA_CONFIG.BR;
  const diff = Math.floor((dt.getTime() - cfg.baseDate.getTime()) / 86400000);
  const isA = (((diff % cfg.cicloDias) + cfg.cicloDias) % cfg.cicloDias) < cfg.metadeCiclo;
  v = { isA: isA, trab: (t === 'AC' && isA) || (t === 'BD' && !isA) };
  _escalaCache.set(key, v);
  return v;
}
function checkMnt(dt, t) {
  const key = 'MNT_' + dt.getFullYear() + '_' + dt.getMonth() + '_' + dt.getDate() + '_' + t;
  let v = _escalaCache.get(key);
  if (v !== undefined) return v;
  const cfg = ESCALA_CONFIG.MNT;
  const diff = Math.floor((dt.getTime() - cfg.baseDate.getTime()) / 86400000);
  const ciclo = ((diff % cfg.cicloDias) + cfg.cicloDias) % cfg.cicloDias;
  const isEG = ciclo < cfg.metadeCiclo;
  v = { isEG: isEG, trab: (t === 'EG' ? isEG : !isEG) };
  _escalaCache.set(key, v);
  return v;
}
function check1x1(dt, turma) {
  const key = '1x1_' + dt.getFullYear() + '_' + dt.getMonth() + '_' + dt.getDate() + '_' + turma;
  let v = _escalaCache.get(key);
  if (v !== undefined) return v;
  const cfg = ESCALA_CONFIG['1x1'];
  const diff = Math.floor((dt.getTime() - cfg.baseDate.getTime()) / 86400000);
  const isEquipeA = (turma === '1x1A' || turma === '1x1C');
  const par = (((diff % 2) + 2) % 2) === 0;
  const trab = isEquipeA ? par : !par;
  v = { trab: trab, isEquipeA: isEquipeA };
  _escalaCache.set(key, v);
  return v;
}
function isTurnoNoite1x1(turma) { return (turma === '1x1C' || turma === '1x1D'); }
function isTrabalhando(dt, region, turma) {
  if (region === 'BR') return checkBR(dt, turma).trab;
  if (region === '1x1') return check1x1(dt, turma).trab;
  return checkMnt(dt, turma).trab;
}
function isFerias(dt) {
  const range = getFeriasRange();
  if (!range.inicio || !range.fim) return false;
  const d = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime();
  return d >= new Date(range.inicio + 'T00:00:00').getTime() &&
         d <= new Date(range.fim + 'T00:00:00').getTime();
}
function diaDaSemanaPorExtenso(data) {
  const dias = ['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'];
  return dias[data.getDay()];
}
function formatarTurmaParaVoz(turma) {
  if (!turma) return '';
  if (turma === '1x1A') return '1x1 manhã equipe A';
  if (turma === '1x1B') return '1x1 manhã equipe B';
  if (turma === '1x1C') return '1x1 noite equipe A';
  if (turma === '1x1D') return '1x1 noite equipe B';
  if (turma.length !== 2) return turma;
  return turma.split('').join(' e ');
}
function nomeRegiao(region) {
  if (region === 'BR') return 'ECOFLAC';
  if (region === '1x1') return '1x1';
  return 'MANUTENÇÃO';
}

/* ============================================================
   10) RELÓGIO
   ============================================================ */
let clockInterval = null;
function startClock() {
  if (clockInterval) clearInterval(clockInterval);
  clockInterval = setInterval(function () {
    if (document.visibilityState === 'visible') tick();
  }, 1000);
}
document.addEventListener('visibilitychange', function () {
  if (document.visibilityState === 'hidden') {
    if (clockInterval) clearInterval(clockInterval);
  } else { startClock(); tick(); }
});
function tick() {
  const now = new Date();
  const bigClock = document.getElementById('big-clock');
  if (bigClock) bigClock.innerText = now.toLocaleTimeString('pt-BR');
  const msg = document.getElementById('status-msg');
  if (!msg) return;
  if (isFerias(now)) {
    msg.innerText = 'EM FÉRIAS \u2708\uFE0F';
    msg.style.color = '#7030A0';
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

/* ============================================================
   11) PWA / INSTALAÇÃO / ATUALIZAÇÃO
   ============================================================ */
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', function (e) {
  e.preventDefault();
  deferredPrompt = e;
  const btn = document.getElementById('install-button');
  if (btn) btn.style.display = 'flex';
});
function installPWA() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt = null;
    const btn = document.getElementById('install-button');
    if (btn) btn.style.display = 'none';
  }
}
function mostrarBannerAtualizacao() {
  const b = document.getElementById('update-banner');
  if (b) b.classList.add('show');
}
function dispensarAtualizacao() {
  const b = document.getElementById('update-banner');
  if (b) b.classList.remove('show');
}
function aplicarAtualizacao() {
  if (navigator.serviceWorker) {
    navigator.serviceWorker.getRegistration().then(function (reg) {
      if (reg && reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    });
  }
  setTimeout(function () { window.location.reload(); }, 400);
}
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', function (event) {
    if (event.data && event.data.type === 'SW_UPDATED') mostrarBannerAtualizacao();
  });
}
if (getStorageValue('braun_update_pending') === 'true') {
  window.addEventListener('load', function () {
    setTimeout(function () {
      mostrarBannerAtualizacao();
      removeStorageValue('braun_update_pending');
    }, 1500);
  });
}

/* ============================================================
   12) REGIÃO / BADGE / LEGENDA
   ============================================================ */
function atualizarBadgeTurma() {
  const turmaLetra = getStorageValue('braun_turma_perfil') || 'A';
  const badgeText = document.getElementById('turmaBadgeText');
  if (!badgeText) return;
  if (turmaLetra.indexOf('1x1') === 0) {
    const turno = (turmaLetra === '1x1A' || turmaLetra === '1x1B') ? 'M' : 'N';
    const equipe = (turmaLetra === '1x1A' || turmaLetra === '1x1C') ? 'A' : 'B';
    badgeText.innerText = '1x1 ' + turno + ' ' + equipe;
  } else {
    badgeText.innerText = 'Turma ' + turmaLetra;
  }
}
function atualizarLegenda1x1() {
  const block = document.querySelector('.sticky-header-block');
  if (!block) return;
  if (currentRegion === '1x1') block.classList.add('com-legenda');
  else block.classList.remove('com-legenda');
}
function setRegion(r) {
  haptic(8);
  currentRegion = r;
  setStorageValue('braun_last_region', r);
  document.querySelectorAll('.tab').forEach(function (t) {
    t.classList.remove('active');
    t.setAttribute('aria-selected', 'false');
  });
  const activeTab = document.getElementById('tab-' + r);
  if (activeTab) {
    activeTab.classList.add('active');
    activeTab.setAttribute('aria-selected', 'true');
  }
  if (r === '1x1') {
    currentTurma = getStorageValue('braun_turma_1x1') || '1x1A';
    setStorageValue('braun_turma_1x1', currentTurma);
  } else {
    const savedTurma = getStorageValue('braun_turma_' + r);
    currentTurma = savedTurma || (r === 'BR' ? 'AC' : 'EG');
  }
  _escalaCache.clear();
  atualizarLegenda1x1();
  gerarCalendario();
  tick();
  scrollParaMes(mesAtualVisivel, anoAtualVisivel);
}

/* ============================================================
   13) BANNER DE AVISOS
   ============================================================ */
function atualizarBannerAvisos() {
  const banner = document.getElementById('banner-avisos');
  const content = document.getElementById('bannerContent');
  const mesNav = document.getElementById('mesNav');
  if (!banner || !content || !mesNav) return;
  const logs = JSON.parse(getStorageValue('logs_v26') || '{}');
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const notasFuturas = Object.keys(logs)
    .filter(function (iso) {
      const d = new Date(iso + 'T00:00:00');
      return d >= hoje && logs[iso] && logs[iso].trim() !== '';
    })
    .sort();
  if (notasFuturas.length === 0) {
    banner.classList.remove('show');
    mesNav.classList.add('sem-banner');
    return;
  }
  let html = '';
  notasFuturas.forEach(function (iso) {
    const partes = iso.split('-');
    const dataFmt = partes[2] + '/' + partes[1];
    html += '<span class="banner-item"><span class="material-symbols-outlined">event</span>' +
            '<strong>' + dataFmt + '</strong> &mdash; ' + escapeHtml(logs[iso]) + '</span>';
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
  const minhaGeracao = ++calendarioGeracao;
  let currentMonth = 0;
  const totalMonths = 12;
  const ano = anoAtualVisivel;

  function construirProximoMes() {
    if (minhaGeracao !== calendarioGeracao) return;
    if (currentMonth >= totalMonths) {
      setTimeout(function () {
        if (minhaGeracao !== calendarioGeracao) return;
        scrollParaMes(mesAtualVisivel, anoAtualVisivel);
      }, 100);
      return;
    }
    const m = currentMonth;
    const t = currentTurma;
    const fer = getFeriados(ano);
    const lang = translations[currentRegion];
    const logs = JSON.parse(getStorageValue('logs_v26') || '{}');
    const hojeStr = new Date().toDateString();
    const dtM = new Date(ano, m, 1);
    const nomeM = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(dtM);
    const container = document.createElement('div');
    container.className = 'mes-container';
    container.dataset.mes = m;
    container.dataset.ano = ano;

    let hF = '<div class="mes-face mes-front">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin:5px 10px 0 10px;">' +
      '<span style="color:var(--primary);font-weight:800;text-transform:capitalize;font-size:1.1em;">' + nomeM + '</span>' +
      '<span style="color:var(--primary);font-weight:800;font-size:1.1em;">' + ano + '</span>' +
      '</div><div class="grid"><div class="dia-label">W</div>' +
      lang.days.map(function (s) { return '<div class="dia-label">' + s + '</div>'; }).join('');

    let hB = '<div class="mes-face mes-back">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin:5px 10px 0 10px;">' +
      '<span style="font-weight:800;text-transform:capitalize;font-size:1.1em;">' + nomeM + '</span>' +
      '<span style="font-weight:800;font-size:1.1em;">' + ano + '</span>' +
      '</div><div style="font-weight:800;border-bottom:1px solid rgba(255,255,255,0.3);padding-bottom:5px;margin-bottom:10px;">Eventos do mês</div>';

    let hasEv = false;
    const diasNoMes = new Date(ano, m + 1, 0).getDate();
    const diaSemanaInicial = dtM.getDay();
    const esp = diaSemanaInicial === 0 ? 6 : diaSemanaInicial - 1;
    hF += '<div class="dia-label-w">' + getWeekNumberCached(dtM) + '</div>';
    for (let i = 0; i < esp; i++) hF += '<div></div>';

    let colAtual = esp;
    for (let d = 1; d <= diasNoMes; d++) {
      const at = new Date(ano, m, d);
      const isoS = String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
      const isoF = ano + '-' + isoS;
      const f = fer[isoS];
      const nt = logs[isoF];
      if (colAtual === 7) {
        colAtual = 0;
        hF += '<div class="dia-label-w">' + getWeekNumberCached(at) + '</div>';
      }
      let cls = 'dia ';
      let pista = '';
      let statusHumano = '';
      if (currentRegion === 'BR') {
        const r = checkBR(at, t);
        cls += (r.isA ? 'AMARELO ' : 'VERDE ');
        cls += (r.trab ? 'TRABALHO ' : 'FOLGA ');
        pista = r.trab ? 'T' : 'F';
        statusHumano = r.trab ? 'trabalhando' : 'de folga';
      } else if (currentRegion === '1x1') {
        const r = check1x1(at, t);
        const noite = isTurnoNoite1x1(t);
        if (r.trab) {
          cls += (noite ? 'ROXO ' : 'LARANJA ') + 'TRABALHO ';
          pista = noite ? 'N' : 'M';
          statusHumano = noite ? 'trabalhando no turno da noite' : 'trabalhando no turno da manhã';
        } else {
          cls += 'VERDE FOLGA ';
          pista = 'F';
          statusHumano = 'de folga';
        }
      } else {
        const mnt = checkMnt(at, t);
        cls += (mnt.isEG ? 'AZUL ' : 'VERDE ');
        cls += (mnt.trab ? 'TRABALHO ' : 'FOLGA ');
        pista = mnt.trab ? 'T' : 'F';
        statusHumano = mnt.trab ? 'trabalhando' : 'de folga';
      }
      if (hojeStr === at.toDateString()) cls += 'hoje ';
      if (nt) cls += 'HAS_NOTE ';
      if (isFerias(at)) { cls += 'FERIAS '; statusHumano = 'em férias'; }
      if (f || nt) {
        hasEv = true;
        hB += '<div style="font-size:0.9em;margin-bottom:8px;"><b>' + d + ':</b> ' +
              (f || '') + (nt ? ' &#128221; ' + escapeHtml(nt) : '') + '</div>';
      }
      const ariaLabel = d + ' de ' + nomeM + ' de ' + ano + ', ' + statusHumano +
        (f ? ', feriado: ' + f : '') + (nt ? ', com anotação' : '') + '. Toque para ver detalhes.';
      hF += '<div class="' + cls.trim() + '" data-pista="' + pista + '" data-iso="' + isoF +
            '" role="button" tabindex="0" aria-label="' + escapeHtml(ariaLabel) + '">' + d + '</div>';
      colAtual++;
    }
    hF += '</div></div>';
    hB += (hasEv ? '' : '<div style="opacity:0.6;font-size:0.9em;">Sem registros.</div>') + '</div>';

    if (minhaGeracao !== calendarioGeracao) return;
    container.innerHTML = '<div class="mes-inner">' + hF + hB + '</div>';
    box.appendChild(container);
    currentMonth++;
    requestAnimationFrame(function () {
      if (minhaGeracao !== calendarioGeracao) return;
      setTimeout(construirProximoMes, 0);
    });
  }
  construirProximoMes();
  atualizarTituloMes();
}

function bindCalendarioDelegation() {
  const box = document.getElementById('calendario-box');
  if (!box || box.dataset.bound === '1') return;
  box.dataset.bound = '1';

  function handleDia(el) {
    haptic(8);
    if (el.dataset.iso) openCard(el.dataset.iso);
  }
  box.addEventListener('click', function (e) {
    const dia = e.target.closest('.dia');
    if (dia) { e.stopPropagation(); handleDia(dia); return; }
    const face = e.target.closest('.mes-face');
    if (face && face.parentElement) {
      face.parentElement.classList.toggle('flipped');
    }
  });
  box.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const dia = e.target.closest('.dia');
    if (dia) { e.preventDefault(); handleDia(dia); return; }
    const face = e.target.closest('.mes-face');
    if (face && face.parentElement) {
      e.preventDefault();
      face.parentElement.classList.toggle('flipped');
    }
  });
}

/* ============================================================
   15) MODAIS — ABRIR / FECHAR
   ============================================================ */
function openCard(iso) {
  dataAtiva = iso;
  const logs = JSON.parse(getStorageValue('logs_v26') || '{}');
  const d = iso.split('-');
  document.getElementById('card-data').innerText = d[2] + '/' + d[1] + '/' + d[0];
  document.getElementById('noteInput').value = logs[iso] || '';
  const dtSel = new Date(d[0], d[1] - 1, d[2]);
  const yy = dtSel.getFullYear().toString().slice(-2);
  const ww = String(getWeekNumberCached(dtSel)).padStart(2, '0');
  let diaSem = dtSel.getDay();
  diaSem = (diaSem === 0) ? 7 : diaSem;
  document.getElementById('lote-display').innerText = yy + ww + diaSem;
  focusModal('infoCard');
}
function copyLote() {
  haptic(10);
  const disp = document.getElementById('lote-display');
  const lote = disp.innerText;
  const orig = lote;
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(lote).catch(function () {});
  } else {
    const textArea = document.createElement('textarea');
    textArea.value = lote;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();
    try { document.execCommand('copy'); } catch (err) {}
    document.body.removeChild(textArea);
  }
  disp.innerText = 'COPIADO!';
  toast('Lote copiado para a área de transferência.', 'sucesso', 2000);
  setTimeout(function () { disp.innerText = orig; }, 1000);
}
function saveNota() {
  const log = document.getElementById('noteInput').value;
  const logs = JSON.parse(getStorageValue('logs_v26') || '{}');
  if (log.trim() === '') { delete logs[dataAtiva]; }
  else { logs[dataAtiva] = log.trim(); }
  setStorageValue('logs_v26', JSON.stringify(logs));
  closeAllModals();
  gerarCalendario();
  atualizarBannerAvisos();
  toast('Anotação salva.', 'sucesso');
}
function openHamburger() {
  document.getElementById('hamburgerDrawer').classList.add('open');
  document.getElementById('drawerOverlay').classList.add('show');
  const menuBtn = document.getElementById('menuButton');
  if (menuBtn) menuBtn.setAttribute('aria-expanded', 'true');
  setTimeout(function () {
    const close = document.querySelector('#hamburgerDrawer .drawer-close-btn');
    if (close) close.focus();
  }, 100);
}
function closeHamburger() {
  document.getElementById('hamburgerDrawer').classList.remove('open');
  document.getElementById('drawerOverlay').classList.remove('show');
  const menuBtn = document.getElementById('menuButton');
  if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');
  if (menuBtn) menuBtn.focus();
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
function openColaboradorDoMes() { closeHamburger(); preencherDadosModais(); focusModal('colaboradorDoMesCard'); }
function openMeusPedidos() { closeHamburger(); preencherDadosModais(); focusModal('meusPedidosCard'); }
function openConfig() {
  document.getElementById('minimalGreetingToggle').checked = (getStorageValue('braun_minimal_greeting') === 'true');
  const voiceResponse = getStorageValue('braun_voice_response');
  document.getElementById('voiceResponseToggle').checked = (voiceResponse !== 'false');
  document.getElementById('hapticToggle').checked = (getStorageValue('braun_haptic') !== 'false');
  focusModal('configCard');
}
function openFerias() {
  document.getElementById('feriasInicio').value = getStorageValue('braun_ferias_inicio') || '';
  document.getElementById('feriasFim').value = getStorageValue('braun_ferias_fim') || '';
  document.getElementById('configCard').classList.remove('show');
  focusModal('feriasCard');
}
function openStats() {
  const ano = parseInt(currentAno);
  const turma = currentTurma;
  const cacheKey = ano + '_' + turma + '_' + currentRegion;
  if (cachedStats[cacheKey]) {
    document.getElementById('stats-content').innerHTML = cachedStats[cacheKey];
    document.getElementById('configCard').classList.remove('show');
    focusModal('statsCard');
    return;
  }
  const feriados = getFeriados(ano);
  let diasTrabalho = 0, diasFolga = 0, feriadosTrab = 0, feriadosFolga = 0, listaFeriadosHTML = '';
  for (let m = 0; m < 12; m++) {
    for (let d = 1; d <= new Date(ano, m + 1, 0).getDate(); d++) {
      const dataTeste = new Date(ano, m, d);
      const isoS = String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
      const res = isTrabalhando(dataTeste, currentRegion, turma);
      if (res) diasTrabalho++; else diasFolga++;
      if (feriados[isoS]) {
        if (res) feriadosTrab++; else feriadosFolga++;
        listaFeriadosHTML += '<div>' + feriados[isoS] + ' (' + (res ? 'TRABALHA' : 'FOLGA') + ')</div>';
      }
    }
  }
  const htmlStats =
    '<div class="stat-grid">' +
    '<div class="stat-card-big purple"><div class="stat-val-big purple">' + diasTrabalho + '</div><div class="stat-lab-big">Dias Trabalhados</div></div>' +
    '<div class="stat-card-big teal"><div class="stat-val-big teal">' + diasFolga + '</div><div class="stat-lab-big">Dias de Folga</div></div>' +
    '</div>' +
    '<div style="background:var(--bg);border-radius:15px;padding:15px;border:1px solid var(--border);margin-top:10px;">' +
    '<div style="display:flex;justify-content:space-between;font-weight:800;margin-bottom:5px;"><span>Feriados trabalhados</span><span style="color:var(--accent);">' + feriadosTrab + '</span></div>' +
    '<div style="display:flex;justify-content:space-between;font-weight:800;margin-bottom:5px;"><span>Feriados de folga</span><span style="color:var(--verde);">' + feriadosFolga + '</span></div>' +
    (listaFeriadosHTML ? '<div style="margin-top:12px;border-top:1px solid var(--border);padding-top:12px;font-size:0.85em;">' + listaFeriadosHTML + '</div>' : '') +
    '</div>';
  cachedStats[cacheKey] = htmlStats;
  document.getElementById('stats-content').innerHTML = htmlStats;
  document.getElementById('configCard').classList.remove('show');
  focusModal('statsCard');
}

/* ============================================================
   16) PERFIL / PEDIDOS / VOTAÇÃO
   ============================================================ */
function salvarDadosPerfil() {
  const nome = document.getElementById('nomePerfil').value;
  const matricula = document.getElementById('matriculaPerfil').value;
  const turma = document.getElementById('turmaPerfil').value;
  const ano = document.getElementById('anoPerfil').value;
  const setor = document.getElementById('setorPerfil').value;
  setStorageValue('braun_nome_completo', nome);
  setStorageValue('braun_matricula', matricula);
  setStorageValue('braun_turma_perfil', turma);
  setStorageValue('braun_ano', ano);
  setStorageValue('braun_setor', setor);
  let region, grupo;
  if (['A','B','C','D'].indexOf(turma) > -1) {
    region = 'BR';
    grupo = (turma === 'A' || turma === 'C') ? 'AC' : 'BD';
  } else if (turma.indexOf('1x1') === 0) {
    region = '1x1';
    grupo = turma;
  } else {
    region = 'MNT';
    grupo = (turma === 'E' || turma === 'G') ? 'EG' : 'FH';
  }
  currentRegion = region;
  currentTurma = grupo;
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
  const matricula = getStorageValue('braun_matricula') || '---';
  const turma = getStorageValue('braun_turma_perfil') || '---';
  const ano = getStorageValue('braun_ano') || '---';
  document.getElementById('votacaoNome').innerText = nome;
  document.getElementById('votacaoMatricula').innerText = matricula;
  document.getElementById('votacaoAno').innerText = ano;
  document.getElementById('pedidoNome').innerText = nome;
  document.getElementById('pedidoMatricula').innerText = matricula;
  document.getElementById('pedidoTurma').innerText = turma;
  document.getElementById('pedidoAno').innerText = ano;
}
function abrirFormularioVotacao() {
  haptic(10);
  const nome = getStorageValue('braun_nome_completo') || 'Não informado';
  const matricula = getStorageValue('braun_matricula') || 'Não informado';
  const ano = getStorageValue('braun_ano') || '2026';
  const link = 'https://forms.gle/KfS9XFv9UseZyqnS7?entry.1=' + encodeURIComponent(nome) +
               '&entry.2=' + encodeURIComponent(matricula) + '&entry.3=' + encodeURIComponent(ano);
  window.open(link, '_blank');
}
function enviarPedidoEmail() {
  const nome = getStorageValue('braun_nome_completo') || '';
  const matricula = getStorageValue('braun_matricula') || '';
  const turma = getStorageValue('braun_turma_perfil') || '';
  const ano = getStorageValue('braun_ano') || '';
  const item = document.getElementById('pedidoItem').value.trim();
  const tamanho = document.getElementById('pedidoTamanho').value.trim();
  const obs = document.getElementById('pedidoObs').value.trim();
  if (!item) { toast('Preencha o item desejado.', 'aviso'); return; }
  const assunto = 'Pedido de Uniforme - ' + nome;
  const corpo = 'Nome: ' + nome + '\nMatrícula: ' + matricula + '\nTurma: ' + turma +
                '\nAno: ' + ano + '\n\nItem: ' + item + '\nTamanho: ' + tamanho +
                '\nObservações: ' + obs;
  window.location.href = 'mailto:?subject=' + encodeURIComponent(assunto) +
                        '&body=' + encodeURIComponent(corpo);
  toast('Abrindo seu e-mail...', 'info');
}

/* ============================================================
   17) FÉRIAS / DARK MODE / NAVEGAÇÃO DE MÊS
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
    removeStorageValue('braun_ferias_inicio');
    removeStorageValue('braun_ferias_fim');
    clearFeriasCache();
    closeAllModals(); gerarCalendario(); tick(); atualizarBannerAvisos();
    toast('Férias removidas.', 'info');
  });
}
function toggleDarkMode() {
  document.documentElement.classList.toggle('dark-mode');
  setStorageValue('braun_dark_mode', document.documentElement.classList.contains('dark-mode'));
}
function toggleMinimalGreeting() {
  setStorageValue('braun_minimal_greeting', document.getElementById('minimalGreetingToggle').checked);
}
function toggleVoiceResponse() {
  const checked = document.getElementById('voiceResponseToggle').checked;
  setStorageValue('braun_voice_response', checked ? 'true' : 'false');
}
function toggleHaptic() {
  setStorageValue('braun_haptic', document.getElementById('hapticToggle').checked ? 'true' : 'false');
  if (document.getElementById('hapticToggle').checked) haptic(20);
}
function atualizarTituloMes() {
  const dt = new Date(anoAtualVisivel, mesAtualVisivel, 1);
  const nome = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(dt);
  const el = document.getElementById('mesNavTitle');
  if (el) el.innerText = nome.charAt(0).toUpperCase() + nome.slice(1);
}
function mudarMes(direcao) {
  haptic(6);
  mesAtualVisivel += direcao;
  if (mesAtualVisivel > 11) { mesAtualVisivel = 0; anoAtualVisivel++; }
  else if (mesAtualVisivel < 0) { mesAtualVisivel = 11; anoAtualVisivel--; }
  if (anoAtualVisivel < 2026) { anoAtualVisivel = 2026; mesAtualVisivel = 0; }
  if (anoAtualVisivel > 2027) { anoAtualVisivel = 2027; mesAtualVisivel = 11; }
  if (anoAtualVisivel !== parseInt(currentAno)) {
    currentAno = anoAtualVisivel;
    setStorageValue('braun_ano', String(currentAno));
    _escalaCache.clear();
    gerarCalendario();
    setTimeout(function () { scrollParaMes(mesAtualVisivel, anoAtualVisivel); }, 150);
  } else {
    scrollParaMes(mesAtualVisivel, anoAtualVisivel);
  }
  atualizarTituloMes();
}
function irParaHoje() {
  haptic(10);
  const hoje = new Date();
  mesAtualVisivel = hoje.getMonth();
  anoAtualVisivel = hoje.getFullYear();
  if (anoAtualVisivel < 2026 || anoAtualVisivel > 2027) {
    anoAtualVisivel = 2026; mesAtualVisivel = 0;
  }
  if (anoAtualVisivel !== parseInt(currentAno)) {
    currentAno = anoAtualVisivel;
    setStorageValue('braun_ano', String(currentAno));
    _escalaCache.clear();
    gerarCalendario();
    setTimeout(function () { scrollParaMes(mesAtualVisivel, anoAtualVisivel); }, 150);
  } else {
    scrollParaMes(mesAtualVisivel, anoAtualVisivel);
  }
  atualizarTituloMes();
}
function scrollParaMes(mes, ano) {
  let container = document.querySelector('.mes-container[data-mes="' + mes + '"][data-ano="' + ano + '"]');
  if (!container) {
    currentAno = ano;
    setStorageValue('braun_ano', String(currentAno));
    _escalaCache.clear();
    gerarCalendario();
    setTimeout(function () {
      container = document.querySelector('.mes-container[data-mes="' + mes + '"][data-ano="' + ano + '"]');
      if (container) {
        const header = document.querySelector('header');
        const stickyBlock = document.querySelector('.sticky-header-block');
        const headerHeight = header ? header.offsetHeight : 0;
        const blockHeight = stickyBlock ? stickyBlock.offsetHeight : 0;
        const totalOffset = headerHeight + blockHeight + 20;
        const rect = container.getBoundingClientRect();
        const target = window.scrollY + rect.top - totalOffset;
        window.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
      }
    }, 200);
    return;
  }
  const header = document.querySelector('header');
  const stickyBlock = document.querySelector('.sticky-header-block');
  const headerHeight = header ? header.offsetHeight : 0;
  const blockHeight = stickyBlock ? stickyBlock.offsetHeight : 0;
  const totalOffset = headerHeight + blockHeight + 20;
  const rect = container.getBoundingClientRect();
  const target = window.scrollY + rect.top - totalOffset;
  window.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
}
function scrollToToday() {
  const hoje = new Date();
  mesAtualVisivel = hoje.getMonth();
  anoAtualVisivel = hoje.getFullYear();
  if (anoAtualVisivel < 2026 || anoAtualVisivel > 2027) {
    anoAtualVisivel = 2026; mesAtualVisivel = 0;
  }
  if (anoAtualVisivel !== parseInt(currentAno)) {
    currentAno = anoAtualVisivel;
    setStorageValue('braun_ano', String(currentAno));
    _escalaCache.clear();
    gerarCalendario();
    setTimeout(function () { scrollParaMes(mesAtualVisivel, anoAtualVisivel); }, 200);
  } else {
    scrollParaMes(mesAtualVisivel, anoAtualVisivel);
  }
  atualizarTituloMes();
}
function goToGreeting() {
  haptic(15);
  const welcome = document.getElementById('welcomeScreen');
  welcome.classList.add('hide');
  setTimeout(function () {
    welcome.style.display = 'none';
    setStorageValue('braun_visited', 'true');
    scrollToToday();
  }, 500);
}

/* ============================================================
   18) BACKUP / RESTORE
   ============================================================ */
function exportarBackup() {
  try {
    const data = {
      schema: SCHEMA_VERSION,
      app: 'BraunOnLine',
      versao: window.APP_VERSION,
      exportado_em: new Date().toISOString(),
      dados: {}
    };
    BACKUP_KEYS.forEach(function (k) {
      const v = getStorageValue(k);
      if (v !== null) data.dados[k] = v;
    });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dt = new Date().toISOString().split('T')[0];
    a.download = 'braun-backup-' + dt + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast('Backup exportado com sucesso.', 'sucesso');
  } catch (e) {
    console.error(e);
    toast('Falha ao exportar backup.', 'erro');
  }
}
function importarBackup() { document.getElementById('backupFileInput').click(); }
function handleBackupFile(ev) {
  const file = ev.target.files && ev.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const json = JSON.parse(e.target.result);
      if (!json || typeof json !== 'object' || !json.dados) throw new Error('Formato inválido.');
      const schema = json.schema || 0;
      if (schema > SCHEMA_VERSION) {
        toast('Backup de versão mais nova. Atualize o app primeiro.', 'erro', 5000);
        return;
      }
      toastConfirm('Isso substituirá seus dados atuais pelos do backup. Continuar?', function (ok) {
        if (!ok) return;
        Object.keys(json.dados).forEach(function (k) { setStorageValue(k, json.dados[k]); });
        toast('Backup restaurado. Recarregando...', 'sucesso');
        setTimeout(function () { window.location.reload(); }, 900);
      });
    } catch (err) {
      console.error(err);
      toast('Arquivo de backup inválido.', 'erro');
    }
  };
  reader.readAsText(file);
  ev.target.value = '';
}

/* ============================================================
   19) EXPORTAR ICS / NOTIFICAÇÕES
   ============================================================ */
function exportarEscalaICS() {
  const ano = parseInt(currentAno);
  const turma = currentTurma;
  const region = currentRegion;
  const nomeTurma = getStorageValue('braun_turma_perfil') || turma;
  const ics = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Braun OnLine//Escala 2026-2027//PT','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:Escala Braun - ' + nomeTurma,'X-WR-TIMEZONE:America/Sao_Paulo'];
  for (let m = 0; m < 12; m++) {
    const diasNoMes = new Date(ano, m + 1, 0).getDate();
    for (let d = 1; d <= diasNoMes; d++) {
      const data = new Date(ano, m, d);
      const trabalhando = isTrabalhando(data, region, turma);
      const ferias = isFerias(data);
      if (!trabalhando && !ferias) continue;
      const yyyy = data.getFullYear();
      const mm = String(data.getMonth() + 1).padStart(2, '0');
      const dd = String(data.getDate()).padStart(2, '0');
      const dataStr = '' + yyyy + mm + dd;
      const endDate = new Date(data);
      endDate.setDate(endDate.getDate() + 1);
      const endStr = '' + endDate.getFullYear() + String(endDate.getMonth() + 1).padStart(2, '0') + String(endDate.getDate()).padStart(2, '0');
      const titulo = ferias ? 'FERIAS' : 'TRABALHO';
      const descricao = ferias ? 'Periodo de ferias programado' : 'Dia de trabalho - ' + nomeTurma;
      ics.push('BEGIN:VEVENT');
      ics.push('UID:' + dataStr + '-braun-' + turma + '@braunonline');
      ics.push('DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z');
      ics.push('DTSTART;VALUE=DATE:' + dataStr);
      ics.push('DTEND;VALUE=DATE:' + endStr);
      ics.push('SUMMARY:' + titulo);
      ics.push('DESCRIPTION:' + descricao);
      ics.push('END:VEVENT');
    }
  }
  ics.push('END:VCALENDAR');
  const blob = new Blob([ics.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Escala_Braun_' + nomeTurma + '_' + ano + '.ics';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast('Arquivo .ics gerado! Abra no seu app de calendário.', 'sucesso', 4500);
}
function solicitarPermissaoNotificacao() {
  if (!('Notification' in window)) { toast('Navegador sem suporte a notificações.', 'erro'); return Promise.resolve(false); }
  if (Notification.permission === 'granted') return Promise.resolve(true);
  if (Notification.permission !== 'denied') {
    return Notification.requestPermission().then(function (p) { return p === 'granted'; });
  }
  return Promise.resolve(false);
}
function mostrarNotificacaoLocal(titulo, corpo) {
  if (Notification.permission === 'granted') {
    new Notification(titulo, { body: corpo, icon: './maskable_icon_x192.png', badge: './maskable_icon_x192.png', tag: 'braun-lembrete', renotify: true });
  }
}
function agendarLembreteTurno() {
  const amanha = new Date();
  amanha.setDate(amanha.getDate() + 1);
  amanha.setHours(0, 0, 0, 0);
  const trabalhando = isTrabalhando(amanha, currentRegion, currentTurma);
  const ferias = isFerias(amanha);
  if (ferias) mostrarNotificacaoLocal('Férias amanhã', 'Aproveite seu descanso!');
  else if (trabalhando) mostrarNotificacaoLocal('Trabalho amanhã', 'Você está escalado para trabalhar amanhã.');
  else mostrarNotificacaoLocal('Folga amanhã', 'Aproveite seu dia de folga!');
}
function iniciarNotificacoes() {
  solicitarPermissaoNotificacao().then(function (permitido) {
    if (permitido) {
      const ultimaVerificacao = getStorageValue('braun_ultima_notificacao');
      const hoje = new Date().toDateString();
      if (ultimaVerificacao !== hoje) {
        agendarLembreteTurno();
        setStorageValue('braun_ultima_notificacao', hoje);
      }
      toast('Lembretes ativados com sucesso!', 'sucesso');
    } else {
      toast('Permissão negada.', 'erro');
    }
  });
}

/* ============================================================
   20) CARTILHAS (ricas — mantidas do v3.8)
   ============================================================ */
const cartilhasData = [
    {
        id: 'kaizen',
        icone: 'trending_up',
        titulo: 'Kaizen – Melhoria Contínua',
        conteudo: '<p><strong>Kaizen</strong> é uma filosofia japonesa que significa "mudança para melhor". No ambiente industrial, ela se traduz em <strong>pequenas melhorias diárias</strong> realizadas por todos os colaboradores.</p><div class="cartilha-destaque"><strong>Princípios do Kaizen:</strong><br> • Eliminar desperdícios (Muda)<br> • Padronizar processos<br> • Envolver todos os níveis hierárquicos<br> • Focar em dados e fatos</div><div class="cartilha-exemplo"><strong>Exemplo prático:</strong> Um operador percebe que a troca de ferramenta em uma máquina demora 15 minutos. Ele sugere uma nova disposição das ferramentas, reduzindo o tempo para 8 minutos – uma melhoria simples, mas que gera ganho de produtividade.</div><p><strong>Benefícios:</strong> Aumento da eficiência, redução de custos, maior engajamento da equipe e melhoria da qualidade.</p>',
        quiz: [
            { pergunta: 'O que significa a palavra Kaizen?', opcoes: ['Grande revolução', 'Mudança para melhor', 'Padronização total', 'Controle de qualidade'], certa: 1 },
            { pergunta: 'Qual é um dos princípios do Kaizen?', opcoes: ['Focar apenas em grandes mudanças', 'Eliminar desperdícios', 'Centralizar decisões na diretoria', 'Ignorar dados'], certa: 1 },
            { pergunta: 'O Kaizen busca melhorias:', opcoes: ['Apenas na produção', 'Somente na gestão', 'Pequenas e diárias', 'Apenas em crises'], certa: 2 }
        ]
    },
    {
        id: '5s',
        icone: 'cleaning_services',
        titulo: 'Os 5S – Organização e Limpeza',
        conteudo: '<p>Os <strong>5S</strong> são cinco sensos que promovem um ambiente de trabalho organizado, limpo e seguro. Eles são a base para a qualidade e produtividade.</p><div class="cartilha-destaque"><strong>Os 5S:</strong><br><b>1. Seiri (Utilização):</b> Separar o que é útil do que não é.<br><b>2. Seiton (Ordenação):</b> Organizar cada coisa em seu lugar.<br><b>3. Seiso (Limpeza):</b> Manter o ambiente limpo.<br><b>4. Seiketsu (Padronização):</b> Criar regras para manter os três primeiros.<br><b>5. Shitsuke (Disciplina):</b> Seguir os padrões com disciplina.</div><div class="cartilha-exemplo"><strong>Exemplo:</strong> Na área de produção, aplicar o 5S significa que ferramentas têm lugar fixo, pisos estão sempre limpos e todos sabem onde encontrar o que precisam.</div><p><strong>Resultado:</strong> Menos acidentes, maior qualidade, melhor clima organizacional e eficiência operacional.</p>',
        quiz: [
            { pergunta: 'Quantos sensos compõem os 5S?', opcoes: ['3', '5', '7', '10'], certa: 1 },
            { pergunta: 'O Seiri (Utilização) consiste em:', opcoes: ['Limpar o ambiente', 'Organizar ferramentas', 'Separar o útil do inútil', 'Criar padrões'], certa: 2 },
            { pergunta: 'Qual senso trata da "Disciplina" para manter os padrões?', opcoes: ['Seiso', 'Seiketsu', 'Shitsuke', 'Seiton'], certa: 2 }
        ]
    },
    {
        id: 'pdca',
        icone: 'cycle',
        titulo: 'PDCA – Planejar, Fazer, Checar, Agir',
        conteudo: '<p>O <strong>PDCA</strong> é um método de gestão para resolver problemas e implementar melhorias de forma estruturada. É um ciclo contínuo.</p><div class="cartilha-destaque"><strong>Etapas do PDCA:</strong><br><b>P (Plan – Planejar):</b> Definir metas e plano de ação.<br><b>D (Do – Fazer):</b> Executar o plano.<br><b>C (Check – Checar):</b> Verificar os resultados.<br><b>A (Act – Agir):</b> Padronizar ou corrigir.</div><div class="cartilha-exemplo"><strong>Exemplo:</strong> Uma linha de envase apresenta variação de peso. A equipe planeja ajustar a máquina (P), executa (D), mede os pesos (C) e, se o resultado for bom, padroniza o ajuste (A).</div><p><strong>Uso:</strong> O PDCA é usado em projetos de melhoria, auditorias, gestão de qualidade e rotinas operacionais.</p>',
        quiz: [
            { pergunta: 'O que significa a sigla PDCA?', opcoes: ['Planejar, Definir, Controlar, Aplicar', 'Planejar, Fazer, Checar, Agir', 'Produzir, Distribuir, Controlar, Avaliar', 'Padronizar, Dirigir, Controlar, Ajustar'], certa: 1 },
            { pergunta: 'Na etapa "C" (Check), o que deve ser feito?', opcoes: ['Executar o plano', 'Verificar os resultados', 'Padronizar a solução', 'Definir metas'], certa: 1 },
            { pergunta: 'O PDCA é um ciclo:', opcoes: ['Linear', 'Contínuo', 'Apenas para gestores', 'Somente para produção'], certa: 1 }
        ]
    },
    {
        id: 'ferramentas',
        icone: 'build',
        titulo: 'Ferramentas da Qualidade',
        conteudo: '<p>Existem diversas ferramentas para identificar e resolver problemas de qualidade. As mais conhecidas são:</p><div class="cartilha-destaque"><strong>Principais ferramentas:</strong><br> • <b>Diagrama de Ishikawa</b> – causas raiz.<br> • <b>5 Porquês</b> – perguntar sucessivamente.<br> • <b>Fluxograma</b> – mapeia o processo.<br> • <b>Gráfico de Pareto</b> – prioriza problemas.</div><div class="cartilha-exemplo"><strong>Exemplo:</strong> Um produto apresenta defeito. Usando o Diagrama de Ishikawa, a equipe lista possíveis causas (máquina, material, método, mão de obra, meio ambiente) e encontra que o material estava fora da especificação.</div><p><strong>Benefícios:</strong> Resolução mais rápida, redução de retrabalho e maior satisfação do cliente.</p>',
        quiz: [
            { pergunta: 'Qual ferramenta é usada para encontrar causas raiz?', opcoes: ['Gráfico de Pareto', 'Diagrama de Ishikawa', 'Fluxograma', '5 Porquês'], certa: 1 },
            { pergunta: 'O Diagrama de Ishikawa também é chamado de:', opcoes: ['Diagrama de Causa e Efeito', 'Diagrama de Pareto', 'Gráfico de Controle', 'Fluxograma'], certa: 0 },
            { pergunta: 'Para priorizar problemas, qual ferramenta é recomendada?', opcoes: ['5 Porquês', 'Fluxograma', 'Gráfico de Pareto', 'Ishikawa'], certa: 2 }
        ]
    },
    {
        id: 'seguranca',
        icone: 'security',
        titulo: 'Segurança do Trabalho',
        conteudo: '<p>A segurança é prioridade na Braun. Todos devem conhecer e aplicar as normas de prevenção.</p><div class="cartilha-destaque"><strong>Pilares da Segurança:</strong><br> • Usar <b>EPIs</b> corretamente.<br> • Manter a área organizada (5S).<br> • Conhecer os <b>procedimentos de emergência</b>.<br> • Reportar qualquer <b>condição insegura</b>.</div><div class="cartilha-exemplo"><strong>Exemplo:</strong> Um colaborador percebe um piso escorregadio. Ele sinaliza o local, comunica a liderança e a equipe de manutenção resolve o problema antes que ocorra um acidente.</div><p><strong>Compromisso:</strong> Segurança é responsabilidade de todos.</p>',
        quiz: [
            { pergunta: 'Qual a primeira ação ao identificar um risco?', opcoes: ['Ignorar', 'Sinalizar e comunicar', 'Continuar trabalhando', 'Aguardar o supervisor'], certa: 1 },
            { pergunta: 'EPI significa:', opcoes: ['Equipamento de Proteção Individual', 'Equipamento de Produção Interna', 'Estação de Proteção Integrada', 'Equipamento Preventivo Industrial'], certa: 0 },
            { pergunta: 'O que deve ser feito em caso de emergência?', opcoes: ['Correr para a saída', 'Seguir o plano de emergência', 'Aguardar instruções', 'Filmar o ocorrido'], certa: 1 }
        ]
    },
    {
        id: 'bpf',
        icone: 'medication',
        titulo: 'Boas Práticas de Fabricação (BPF)',
        conteudo: '<p>As <strong>BPF</strong> garantem a qualidade e segurança dos produtos na indústria farmacêutica.</p><div class="cartilha-destaque"><strong>Princípios das BPF:</strong><br> • <b>Higiene</b> – manter-se limpo.<br> • <b>Controle de processos</b> – monitorar cada etapa.<br> • <b>Rastreabilidade</b> – identificar materiais e produtos.<br> • <b>Documentação</b> – registrar atividades.</div><div class="cartilha-exemplo"><strong>Exemplo:</strong> Na área de envase, os operadores seguem um checklist de limpeza, registram temperaturas e umidade, e todo lote é identificado com código de rastreabilidade.</div><p><strong>Importância:</strong> BPF evitam contaminações e atendem às exigências da ANVISA.</p>',
        quiz: [
            { pergunta: 'O que as BPF garantem?', opcoes: ['Apenas a produtividade', 'Qualidade e segurança do produto', 'Redução de custos', 'Aumento de vendas'], certa: 1 },
            { pergunta: 'Um princípio fundamental das BPF é:', opcoes: ['Usar qualquer roupa', 'Não registrar atividades', 'Manter a higiene pessoal', 'Trabalhar sem supervisão'], certa: 2 },
            { pergunta: 'A rastreabilidade permite:', opcoes: ['Aumentar a velocidade', 'Identificar a origem de um lote', 'Reduzir colaboradores', 'Eliminar a documentação'], certa: 1 }
        ]
    },
    {
        id: 'sustentabilidade',
        icone: 'eco',
        titulo: 'Sustentabilidade e Redução de Desperdícios',
        conteudo: '<p>A Braun está comprometida com a sustentabilidade. Todos podemos contribuir.</p><div class="cartilha-destaque"><strong>Ações sustentáveis:</strong><br> • <b>Economia de energia</b> – apagar luzes e desligar máquinas.<br> • <b>Uso racional de água</b> – evitar vazamentos.<br> • <b>Separação de resíduos</b> – reciclar.<br> • <b>Redução de materiais</b> – evitar impressões.</div><div class="cartilha-exemplo"><strong>Exemplo:</strong> Ao final do turno, verifique se as máquinas estão desligadas, as luzes apagadas e os resíduos foram descartados nos coletores adequados.</div><p><strong>Impacto:</strong> Preserva o meio ambiente, gera economia e fortalece a imagem da empresa.</p>',
        quiz: [
            { pergunta: 'Qual atitude contribui para a sustentabilidade?', opcoes: ['Deixar luzes acesas', 'Descartar resíduos corretamente', 'Usar água em excesso', 'Imprimir documentos desnecessários'], certa: 1 },
            { pergunta: 'A redução de desperdícios beneficia:', opcoes: ['Apenas o meio ambiente', 'Apenas a empresa', 'Todos', 'Nenhum'], certa: 2 },
            { pergunta: 'Qual atitude NÃO é sustentável?', opcoes: ['Desligar equipamentos', 'Reciclar materiais', 'Deixar torneira pingando', 'Reutilizar papel'], certa: 2 }
        ]
    },
    {
        id: 'compliance',
        icone: 'gavel',
        titulo: 'Compliance – Ética e Integridade',
        conteudo: '<p><strong>Compliance</strong> significa agir de acordo com as leis e princípios éticos da empresa.</p><div class="cartilha-destaque"><strong>Pilares do Compliance na Braun:</strong><br> • <b>Código de Conduta</b><br> • <b>Conflito de Interesses</b> – evitar situações pessoais.<br> • <b>Anticorrupção</b> – não oferecer ou receber vantagens.<br> • <b>Proteção de Dados (LGPD)</b><br> • <b>Canal de Denúncia</b> – reportar irregularidades.</div><div class="cartilha-exemplo"><strong>Exemplo:</strong> Um fornecedor oferece um presente de alto valor para agilizar um contrato. A conduta correta é recusar e reportar ao Canal de Denúncia.</div><p><strong>Compromisso:</strong> Todos são responsáveis pela ética e transparência.</p>',
        quiz: [
            { pergunta: 'O que é Compliance?', opcoes: ['Um cargo na diretoria', 'Regras para garantir ética e conformidade', 'Treinamento técnico', 'Ferramenta de produção'], certa: 1 },
            { pergunta: 'Ao receber um presente de um fornecedor, o correto é:', opcoes: ['Aceitar normalmente', 'Recusar e reportar', 'Aceitar se for pequeno', 'Dividir com a equipe'], certa: 1 },
            { pergunta: 'Quem deve seguir as regras de Compliance?', opcoes: ['Apenas a diretoria', 'Apenas o RH', 'Todos os colaboradores', 'Apenas fornecedores'], certa: 2 }
        ]
    },
    {
        id: 'incendio',
        icone: 'local_fire_department',
        titulo: 'Prevenção de Incêndios e Uso de Extintores',
        conteudo: '<p>Em uma indústria farmacêutica, os riscos de incêndio são elevados devido a <strong>solventes inflamáveis</strong>, <strong>produtos oxidantes</strong> e <strong>materiais combustíveis</strong>.</p><div class="cartilha-destaque"><strong>Classes de Incêndio:</strong><br> • <b>Classe A</b> – sólidos (papel, madeira) – Água ou Pó.<br> • <b>Classe B</b> – líquidos inflamáveis – CO₂ ou Pó.<br> • <b>Classe C</b> – elétricos – CO₂ ou Pó (NUNCA água).<br> • <b>Classe D</b> – metais – Pó especial.<br> • <b>Classe K</b> – gorduras – Espuma ou K.</div><div class="cartilha-exemplo"><strong>Método PASS:</strong><br> <b>P</b> – Puxar o pino.<br> <b>A</b> – Apontar para a base do fogo.<br> <b>S</b> – Apertar a alavanca.<br> <b>S</b> – Varrer a base do fogo.</div><p><strong>Cuidados em áreas farmacêuticas:</strong> Em salas limpas, prefira CO₂ em vez de pó químico. Inspecione extintores mensalmente. Mantenha rotas de fuga desobstruídas.</p><p><strong>Conduta:</strong> Acione o alarme, use o extintor se treinado, abandone a área se o fogo se espalhar, chame os bombeiros (193).</p>',
        quiz: [
            { pergunta: 'Qual extintor NUNCA deve ser usado em incêndios elétricos (Classe C)?', opcoes: ['CO₂', 'Pó Químico', 'Água', 'Pó Especial'], certa: 2 },
            { pergunta: 'O que significa a sigla PASS?', opcoes: ['Puxar, Apontar, Apertar, Varrer', 'Parar, Avaliar, Segurar, Sair', 'Prevenir, Atuar, Salvar, Sinalizar', 'Pegar, Arremessar, Soprar, Seguir'], certa: 0 },
            { pergunta: 'Em uma área estéril, qual extintor é mais recomendado?', opcoes: ['Pó Químico', 'Água', 'CO₂', 'Espuma'], certa: 2 }
        ]
    }
];

let cartilhaAtiva = 'kaizen';
let cartilhasLidas = JSON.parse(getStorageValue('braun_cartilhas_lidas') || '[]');

function openCartilhas() { closeHamburger(); renderCartilhas(); focusModal('cartilhasCard'); }
function renderCartilhas() {
  const tabsContainer = document.getElementById('cartilhaTabs');
  const panelsContainer = document.getElementById('cartilhaPanels');
  tabsContainer.innerHTML = '';
  panelsContainer.innerHTML = '';
  const sorted = cartilhasData.slice().sort(function (a, b) {
    const aLida = cartilhasLidas.indexOf(a.id) > -1 ? 1 : 0;
    const bLida = cartilhasLidas.indexOf(b.id) > -1 ? 1 : 0;
    return aLida - bLida;
  });
  sorted.forEach(function (cart) {
    const isActive = cart.id === cartilhaAtiva;
    const estaLida = cartilhasLidas.indexOf(cart.id) > -1;
    const btn = document.createElement('button');
    btn.className = 'cartilha-tab-btn' + (isActive ? ' active' : '') + (estaLida ? ' lida' : '');
    const tituloCurto = cart.titulo.split('–')[0].trim() || cart.titulo;
    btn.innerHTML = '<span class="material-symbols-outlined">' + cart.icone + '</span> ' + tituloCurto;
    btn.addEventListener('click', function () { cartilhaAtiva = cart.id; renderCartilhas(); });
    tabsContainer.appendChild(btn);

    const panel = document.createElement('div');
    panel.className = 'cartilha-panel' + (isActive ? ' active' : '');
    panel.id = 'panel-' + cart.id;
    let quizzesHtml = '';
    cart.quiz.forEach(function (q, qi) {
      let opsHtml = '';
      q.opcoes.forEach(function (op, oi) {
        opsHtml += '<div class="quiz-opcao" data-cart="' + cart.id + '" data-q="' + qi + '" data-o="' + oi + '" role="button" tabindex="0">' + op + '</div>';
      });
      quizzesHtml += '<div class="quiz-pergunta">' + (qi + 1) + '. ' + q.pergunta + '</div>' +
                     '<div class="quiz-opcoes" id="quiz-' + cart.id + '-' + qi + '">' + opsHtml + '</div>' +
                     '<div class="quiz-feedback" id="feedback-' + cart.id + '-' + qi + '"></div>';
    });
    panel.innerHTML =
      '<div class="cartilha-titulo">' +
        (cart.icone ? '<span class="material-symbols-outlined" style="font-size:28px;vertical-align:middle;">' + cart.icone + '</span> ' : '') +
        cart.titulo +
      '</div>' +
      '<div class="cartilha-conteudo">' + cart.conteudo + '</div>' +
      '<button class="cartilha-btn-marcar ' + (estaLida ? 'marcado' : '') + '" data-cart-id="' + cart.id + '">' +
        '<span class="material-symbols-outlined">' + (estaLida ? 'check_circle' : 'circle') + '</span> ' +
        (estaLida ? 'MARCADA COMO LIDA' : 'MARCAR COMO LIDA') +
      '</button>' +
      '<div class="cartilha-quiz"><h4>&#128221; Teste seu conhecimento</h4>' + quizzesHtml + '</div>';
    panelsContainer.appendChild(panel);
  });
  panelsContainer.querySelectorAll('.cartilha-btn-marcar').forEach(function (btn) {
    btn.addEventListener('click', function () { toggleCartilhaLida(btn.dataset.cartId); });
  });
  panelsContainer.querySelectorAll('.quiz-opcao').forEach(function (el) {
    const handler = function () {
      responderQuiz(el.dataset.cart, parseInt(el.dataset.q), parseInt(el.dataset.o));
    };
    el.addEventListener('click', handler);
    el.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); handler(); }
    });
  });
  atualizarProgresso();
}
function toggleCartilhaLida(id) {
  haptic(10);
  const index = cartilhasLidas.indexOf(id);
  if (index > -1) cartilhasLidas.splice(index, 1);
  else {
    cartilhasLidas.push(id);
    if (cartilhasLidas.length === 1) salvarConquista('primeiro_passo');
    if (cartilhasLidas.length === 5) salvarConquista('leitor_dedicado');
    if (cartilhasLidas.length === cartilhasData.length) salvarConquista('expert_braun');
  }
  setStorageValue('braun_cartilhas_lidas', JSON.stringify(cartilhasLidas));
  renderCartilhas();
  atualizarNovidadesUI();
}
function atualizarProgresso() {
  const total = cartilhasData.length;
  const lidas = cartilhasLidas.length;
  const pct = Math.round((lidas / total) * 100);
  document.getElementById('progressoFill').style.width = pct + '%';
  document.getElementById('progressoTexto').innerText = lidas + '/' + total;
}
let quizzesAcertados = parseInt(getStorageValue('braun_quizzes_acertados') || '0');
function responderQuiz(cartId, qIndex, opIndex) {
  const cart = cartilhasData.find(function (c) { return c.id === cartId; });
  if (!cart) return;
  const q = cart.quiz[qIndex];
  const opcoesDiv = document.getElementById('quiz-' + cartId + '-' + qIndex);
  const feedback = document.getElementById('feedback-' + cartId + '-' + qIndex);
  if (opcoesDiv.querySelector('.desabilitada')) return;
  haptic(8);
  opcoesDiv.querySelectorAll('.quiz-opcao').forEach(function (el) { el.classList.add('desabilitada'); });
  const opEls = opcoesDiv.querySelectorAll('.quiz-opcao');
  opEls.forEach(function (el, i) {
    if (i === q.certa) el.classList.add('certa');
    else if (i === opIndex && opIndex !== q.certa) el.classList.add('errada');
  });
  if (opIndex === q.certa) {
    feedback.innerHTML = '&#9989; Correto!';
    feedback.className = 'quiz-feedback certo';
    quizzesAcertados++;
    setStorageValue('braun_quizzes_acertados', quizzesAcertados);
    if (quizzesAcertados === 10) salvarConquista('quiz_master');
  } else {
    feedback.innerHTML = '&#10060; Incorreto. A resposta certa é: ' + q.opcoes[q.certa];
    feedback.className = 'quiz-feedback errado';
  }
}

/* ============================================================
   21) NOVIDADES
   ============================================================ */
const novidadesData = [
  { id: 'nov17', titulo: '&#128274; Backup e Restauração', descricao: 'Exporte e importe todos os seus dados em JSON. Troque de celular sem perder nada.', data: '2026-09-27', cartilhaId: null },
  { id: 'nov16', titulo: '&#128101; "Fase" virou "Equipe"', descricao: 'Na escala 1x1, trocamos "fase A / fase B" por "Equipe A / Equipe B".', data: '2026-09-14', cartilhaId: null },
  { id: 'nov15', titulo: '&#127912; Legenda das cores no 1x1', descricao: 'Legenda mostrando o significado das cores abaixo do seletor de meses.', data: '2026-09-14', cartilhaId: null },
  { id: 'nov14', titulo: '&#127991;&#65039; Pílula do cabeçalho abreviada', descricao: 'Na escala 1x1, a pílula mostra M para Manhã e N para Noite.', data: '2026-09-14', cartilhaId: null },
  { id: 'nov13', titulo: '&#127760; Escala 1x1 com turnos e equipes!', descricao: 'A escala 1x1 foi dividida em 4 variações: Manhã A, Manhã B, Noite A e Noite B.', data: '2026-09-12', cartilhaId: null },
  { id: 'nov5', titulo: '&#129675; Nova Cartilha: Prevenção de Incêndios', descricao: 'Aprenda sobre classes de incêndio, método PASS e cuidados em áreas farmacêuticas.', data: '2026-07-05', cartilhaId: 'incendio' },
  { id: 'nov1', titulo: '&#128216; Nova Cartilha: Compliance', descricao: 'Aprenda sobre Ética, Código de Conduta, Anticorrupção, LGPD e Canal de Denúncia.', data: '2026-07-04', cartilhaId: 'compliance' }
];
let novidadesLidas = JSON.parse(getStorageValue('braun_novidades_lidas') || '[]');

function openNovidades() { closeAllModals(); renderNovidades(); focusModal('novidadesCard'); }
function renderNovidades() {
  const container = document.getElementById('novidadesLista');
  container.innerHTML = '';
  const sorted = novidadesData.slice().sort(function (a, b) { return new Date(b.data) - new Date(a.data); });
  sorted.forEach(function (nov) {
    const lida = novidadesLidas.indexOf(nov.id) > -1;
    const card = document.createElement('div');
    card.className = 'novidade-card' + (lida ? ' lida' : '');
    const badgeHtml = !lida ? '<span class="badge-novo">NOVO</span>' : '';
    let linkHtml = '';
    if (nov.cartilhaId) {
      linkHtml = '<span class="link-cartilha" data-cart="' + nov.cartilhaId + '">Abrir cartilha &rarr;</span>';
    }
    card.innerHTML = '<div class="novidade-titulo">' + nov.titulo + ' ' + badgeHtml + '</div>' +
      '<div class="novidade-desc">' + nov.descricao + '</div>' +
      linkHtml +
      '<span class="novidade-data">' + formatarData(nov.data) + '</span>';
    card.addEventListener('click', function (e) {
      const link = e.target.closest('.link-cartilha');
      if (link) { e.stopPropagation(); abrirCartilhaPorId(link.dataset.cart); return; }
      marcarNovidadeLida(nov.id);
      if (nov.cartilhaId) abrirCartilhaPorId(nov.cartilhaId);
      else { renderNovidades(); atualizarNovidadesUI(); }
    });
    container.appendChild(card);
  });
  atualizarNovidadesUI();
}
function marcarNovidadeLida(id) {
  if (novidadesLidas.indexOf(id) === -1) {
    novidadesLidas.push(id);
    setStorageValue('braun_novidades_lidas', JSON.stringify(novidadesLidas));
  }
  renderNovidades();
  atualizarNovidadesUI();
}
function marcarTodasNovidadesLidas() {
  novidadesData.forEach(function (n) {
    if (novidadesLidas.indexOf(n.id) === -1) novidadesLidas.push(n.id);
  });
  setStorageValue('braun_novidades_lidas', JSON.stringify(novidadesLidas));
  renderNovidades();
  atualizarNovidadesUI();
  toast('Todas as novidades marcadas como lidas.', 'info');
}
function atualizarNovidadesUI() {
  const total = novidadesData.length;
  const lidas = novidadesLidas.length;
  const naoLidas = total - lidas;
  const badge = document.getElementById('novidadesBadge');
  const btn = document.getElementById('btn-flutuante-novidades');
  const sino = document.getElementById('sinoIcon');
  if (naoLidas > 0) {
    badge.style.display = 'inline';
    badge.innerText = naoLidas;
    btn.style.display = 'flex';
    sino.classList.add('animar-sino');
  } else {
    badge.style.display = 'none';
    btn.style.display = 'none';
    sino.classList.remove('animar-sino');
  }
}
function formatarData(dataStr) {
  const d = new Date(dataStr + 'T00:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}
function abrirCartilhaPorId(id) { closeAllModals(); cartilhaAtiva = id; openCartilhas(); }

/* ============================================================
   22) PESQUISA + VOZ
   ============================================================ */
let resultadoPesquisaAtual = null;
let recognitionInstance = null;

function openPesquisa() {
  closeAllModals();
  focusModal('pesquisaCard');
  const hoje = new Date();
  document.getElementById('pesquisaData').value = hoje.toISOString().split('T')[0];
  document.getElementById('pesquisaDataTexto').value = '';
  document.getElementById('resultadoTexto').innerHTML = 'Nenhuma pesquisa realizada.';
  document.getElementById('resultadoDetalhe').innerText = '';
  resultadoPesquisaAtual = null;
  atualizarBotaoOuvir();
}
function fecharPesquisa() { closeAllModals(); pararVoz(); }
function atualizarBotaoOuvir() {
  const btn = document.getElementById('btnOuvirResultado');
  const icon = document.getElementById('btnOuvirIcon');
  const texto = document.getElementById('btnOuvirTexto');
  if (!btn) return;
  const falando = window.speechSynthesis && window.speechSynthesis.speaking;
  if (falando) {
    btn.classList.add('parar');
    icon.textContent = 'stop_circle';
    texto.textContent = 'Parar';
  } else {
    btn.classList.remove('parar');
    icon.textContent = 'volume_up';
    texto.textContent = 'Ouvir resposta';
  }
}
function toggleLerResultado() {
  if (window.speechSynthesis && window.speechSynthesis.speaking) pararVoz();
  else lerResultado();
}
function pararVoz() {
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  atualizarBotaoOuvir();
}
function parseDataTexto(texto) {
  const meses = {
    janeiro: 0, fevereiro: 1, marco: 2, 'março': 2, abril: 3, maio: 4, junho: 5,
    julho: 6, agosto: 7, setembro: 8, outubro: 9, novembro: 10, dezembro: 11,
    jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5, jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11
  };
  texto = texto.toLowerCase().trim();
  let match = texto.match(/^(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{2,4})$/);
  if (match) {
    let dia = parseInt(match[1]), mes = parseInt(match[2]) - 1, ano = parseInt(match[3]);
    if (ano < 100) ano += 2000;
    const d = new Date(ano, mes, dia);
    if (!isNaN(d.getTime())) return d;
  }
  match = texto.match(/^(\d{1,2})\s*(?:de\s*)?([a-zçãáé]+)\s*(?:de\s*)?(\d{2,4})$/);
  if (match) {
    let dia = parseInt(match[1]), mesNome = match[2], ano = parseInt(match[3]);
    if (ano < 100) ano += 2000;
    if (meses[mesNome] !== undefined) {
      const d = new Date(ano, meses[mesNome], dia);
      if (!isNaN(d.getTime())) return d;
    }
  }
  match = texto.match(/^([a-zçãáé]+)\s*(?:de\s*)?(\d{2,4})$/);
  if (match) {
    let mesNome = match[1], ano = parseInt(match[2]);
    if (ano < 100) ano += 2000;
    if (meses[mesNome] !== undefined) {
      const d = new Date(ano, meses[mesNome], 1);
      if (!isNaN(d.getTime())) return d;
    }
  }
  return null;
}
function pesquisarData() {
  const dataInput = document.getElementById('pesquisaData').value;
  let textoInput = document.getElementById('pesquisaDataTexto').value.trim();
  let dataObj = null;
  if (textoInput) {
    dataObj = parseDataTexto(textoInput);
    if (dataObj) {
      const ano = dataObj.getFullYear();
      const mes = String(dataObj.getMonth() + 1).padStart(2, '0');
      const dia = String(dataObj.getDate()).padStart(2, '0');
      document.getElementById('pesquisaData').value = ano + '-' + mes + '-' + dia;
    }
  } else if (dataInput) {
    const partes = dataInput.split('-');
    dataObj = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]));
  }
  const resultadoDiv = document.getElementById('resultadoTexto');
  const detalheDiv = document.getElementById('resultadoDetalhe');
  if (!dataObj || isNaN(dataObj.getTime())) {
    resultadoDiv.innerHTML = '&#10060; Data inválida.';
    detalheDiv.innerText = 'Use dd/mm/aaaa ou escreva por extenso.';
    resultadoPesquisaAtual = null;
    atualizarBotaoOuvir();
    return;
  }
  const region = currentRegion;
  const turma = currentTurma;
  const trabalhando = isTrabalhando(dataObj, region, turma);
  const ferias = isFerias(dataObj);
  let status, cor, iconeHtml, detalhes;
  const regiaoNome = nomeRegiao(region);
  const turmaFalada = formatarTurmaParaVoz(turma);
  if (region === '1x1') detalhes = 'Região: Escala ' + turmaFalada;
  else detalhes = 'Região: ' + regiaoNome + ' · Turmas ' + turmaFalada;
  if (ferias) { status = 'EM FÉRIAS'; cor = 'var(--ferias)'; iconeHtml = '<span class="icone-ferias">&#9992;&#65039;</span>'; }
  else if (trabalhando) {
    if (region === '1x1') {
      const noite = isTurnoNoite1x1(turma);
      status = noite ? 'TRABALHANDO (NOITE)' : 'TRABALHANDO (MANHÃ)';
    } else status = 'TRABALHANDO';
    cor = region === '1x1' && isTurnoNoite1x1(turma) ? 'var(--roxo-1x1)' : 'var(--accent)';
    iconeHtml = '<span class="icone-trabalho">&#9881;&#65039;</span>';
  } else { status = 'DE FOLGA'; cor = 'var(--primary)'; iconeHtml = '<span class="icone-folga">&#127754;</span>'; }
  const diaSemana = diaDaSemanaPorExtenso(dataObj);
  const dataStr = dataObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  resultadoDiv.style.color = cor;
  resultadoDiv.innerHTML = iconeHtml + '<div><strong>' + diaSemana + ', ' + dataStr + '</strong></div><div style="font-size:1.1em;">' + status + '</div>';
  detalheDiv.innerText = detalhes;
  resultadoPesquisaAtual = { data: dataObj, status: status, detalhes: detalhes, ferias: ferias, trabalhando: trabalhando };
  atualizarBotaoOuvir();
  if (getStorageValue('braun_voice_response') !== 'false') lerResultado();
}
function iniciarReconhecimentoVoz() {
  const campoTexto = document.getElementById('pesquisaDataTexto');
  if (!campoTexto) return;
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    campoTexto.placeholder = 'Seu navegador não suporta voz.';
    toast('Seu navegador não suporta reconhecimento de voz.', 'aviso');
    return;
  }
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (recognitionInstance) { recognitionInstance.abort(); recognitionInstance = null; }
  const recognition = new SpeechRecognition();
  recognition.lang = 'pt-BR';
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.onstart = function () { campoTexto.placeholder = 'Ouvindo...'; campoTexto.style.borderColor = 'var(--accent)'; };
  recognition.onerror = function (event) {
    campoTexto.placeholder = 'Clique no microfone e fale a data...';
    campoTexto.style.borderColor = '';
    recognitionInstance = null;
    if (event.error === 'not-allowed') toast('Permissão de microfone negada.', 'erro');
  };
  recognition.onresult = function (event) {
    campoTexto.value = event.results[0][0].transcript;
    campoTexto.placeholder = 'Clique no microfone e fale a data...';
    campoTexto.style.borderColor = '';
    recognitionInstance = null;
    pesquisarData();
  };
  recognition.onend = function () {
    campoTexto.placeholder = 'Clique no microfone e fale a data...';
    campoTexto.style.borderColor = '';
    recognitionInstance = null;
  };
  try { recognition.start(); recognitionInstance = recognition; } catch (e) { console.warn(e); }
}
function lerResultado() {
  if (!resultadoPesquisaAtual) { toast('Faça uma pesquisa primeiro.', 'aviso'); return; }
  const voz = new SpeechSynthesisUtterance();
  voz.lang = 'pt-BR';
  voz.rate = 1.1;
  const dataObj = resultadoPesquisaAtual.data;
  const diaSemana = diaDaSemanaPorExtenso(dataObj);
  const dataStr = dataObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  voz.text = diaSemana + ', ' + dataStr + '. ' + resultadoPesquisaAtual.status + '. ' + resultadoPesquisaAtual.detalhes + '.';
  voz.onend = atualizarBotaoOuvir;
  voz.onerror = atualizarBotaoOuvir;
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(voz);
    setTimeout(atualizarBotaoOuvir, 100);
  }
}

/* ============================================================
   23) CONQUISTAS
   ============================================================ */
const conquistas = {
  primeiro_passo: { id: 'primeiro_passo', titulo: 'Primeiro Passo', descricao: 'Marcou a primeira cartilha como lida', icone: '&#127937;' },
  leitor_dedicado: { id: 'leitor_dedicado', titulo: 'Leitor Dedicado', descricao: 'Leu 5 cartilhas', icone: '&#128218;' },
  expert_braun:    { id: 'expert_braun', titulo: 'Expert Braun', descricao: 'Completou todas as 9 cartilhas', icone: '&#127942;' },
  quiz_master:     { id: 'quiz_master', titulo: 'Quiz Master', descricao: 'Acertou 10 perguntas de quiz', icone: '&#127919;' }
};
function getConquistas() { return JSON.parse(getStorageValue('braun_conquistas') || '[]'); }
function salvarConquista(id) {
  const lista = getConquistas();
  if (lista.indexOf(id) === -1) {
    lista.push(id);
    setStorageValue('braun_conquistas', JSON.stringify(lista));
    mostrarConquistaDesbloqueada(id);
  }
}
function mostrarConquistaDesbloqueada(id) {
  const c = conquistas[id];
  if (!c) return;
  haptic(20);
  const t = document.createElement('div');
  t.style.cssText = 'position:fixed;bottom:110px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#7030A0,#00A97A);color:white;padding:16px 24px;border-radius:20px;font-weight:800;box-shadow:0 10px 30px rgba(0,0,0,0.3);z-index:3000;display:flex;align-items:center;gap:12px;animation:bounceIn 0.6s cubic-bezier(0.68,-0.55,0.27,1.55);max-width:90%;';
  t.innerHTML = '<span style="font-size:2em;">' + c.icone + '</span><div><div style="font-size:0.75em;opacity:0.85;">CONQUISTA DESBLOQUEADA</div><div style="font-size:1.1em;">' + c.titulo + '</div></div>';
  document.body.appendChild(t);
  setTimeout(function () {
    t.style.opacity = '0';
    t.style.transition = 'opacity 0.4s';
    setTimeout(function () { t.remove(); }, 400);
  }, 3500);
}
function openConquistas() {
  const lista = getConquistas();
  const container = document.getElementById('listaConquistas');
  container.innerHTML = '';
  Object.values(conquistas).forEach(function (c) {
    const desbloqueada = lista.indexOf(c.id) > -1;
    const card = document.createElement('div');
    card.style.cssText = 'background:var(--bg);border-radius:16px;padding:16px;border:1px solid var(--border);display:flex;align-items:center;gap:14px;opacity:' + (desbloqueada ? '1' : '0.45') + ';';
    card.innerHTML = '<div style="font-size:2.2em;">' + c.icone + '</div>' +
      '<div><div style="font-weight:800;font-size:1.05em;">' + c.titulo + '</div>' +
      '<div style="font-size:0.85em;opacity:0.7;">' + c.descricao + '</div>' +
      (desbloqueada ? '<div style="font-size:0.75em;color:var(--primary);font-weight:700;margin-top:4px;">&#10003; Desbloqueada</div>'
                    : '<div style="font-size:0.75em;opacity:0.5;margin-top:4px;">Bloqueada</div>') +
      '</div>';
    container.appendChild(card);
  });
  focusModal('conquistasCard');
}

/* ============================================================
   24) EVENT BINDING — SUBSTITUI TODOS OS onclick/onchange INLINE
   ============================================================ */
const ACTION_MAP = {
  'go-greeting':            goToGreeting,
  'install-pwa':            installPWA,
  'aplicar-atualizacao':    aplicarAtualizacao,
  'dispensar-atualizacao':  dispensarAtualizacao,
  'open-novidades':         openNovidades,
  'open-pesquisa':          openPesquisa,
  'mes-anterior':           function () { mudarMes(-1); },
  'mes-proximo':            function () { mudarMes(1); },
  'ir-hoje':                irParaHoje,
  'close-drawer':           closeHamburger,
  'open-perfil':            openMeuPerfil,
  'open-ramais':            function () { closeHamburger(); openRamais(); },
  'open-colaborador':       openColaboradorDoMes,
  'open-pedidos':           openMeusPedidos,
  'open-cartilhas':         openCartilhas,
  'open-conquistas':        openConquistas,
  'open-config':            function () { closeHamburger(); openConfig(); },
  'toggle-dark':            function () { toggleDarkMode(); closeHamburger(); },
  'open-privacy':           function () { closeHamburger(); openPrivacy(); },
  'close-modals':           closeAllModals,
  'marcar-novidades':       marcarTodasNovidadesLidas,
  'copy-lote':              copyLote,
  'save-nota':              saveNota,
  'open-ferias':            openFerias,
  'open-stats':             openStats,
  'export-ics':             exportarEscalaICS,
  'export-backup':          exportarBackup,
  'import-backup':          importarBackup,
  'iniciar-notif':          iniciarNotificacoes,
  'save-ferias':            saveFerias,
  'confirm-clear-ferias':   confirmarClearFerias,
  'save-perfil-fechar':     function () { salvarDadosPerfil(); closeAllModals(); },
  'votar':                  abrirFormularioVotacao,
  'enviar-pedido':          enviarPedidoEmail,
  'mic':                    iniciarReconhecimentoVoz,
  'pesquisar':              pesquisarData,
  'toggle-voz':             toggleLerResultado,
  'fechar-pesquisa':        fecharPesquisa
};

function bindAll() {
  document.addEventListener('click', function (e) {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const action = el.getAttribute('data-action');
    const fn = ACTION_MAP[action];
    if (typeof fn === 'function') { fn(); }
  });

  document.querySelectorAll('.tab[data-region]').forEach(function (tab) {
    tab.addEventListener('click', function () { setRegion(tab.dataset.region); });
  });

  const turmaBadge = document.getElementById('turmaBadge');
  if (turmaBadge) {
    turmaBadge.addEventListener('click', openMeuPerfil);
    turmaBadge.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openMeuPerfil(); }
    });
  }

  const menuBtn = document.getElementById('menuButton');
  if (menuBtn) menuBtn.addEventListener('click', openHamburger);

  const drawerOverlay = document.getElementById('drawerOverlay');
  if (drawerOverlay) drawerOverlay.addEventListener('click', closeHamburger);

  const overlay = document.getElementById('overlay');
  if (overlay) overlay.addEventListener('click', closeAllModals);

  const mg = document.getElementById('minimalGreetingToggle');
  if (mg) mg.addEventListener('change', toggleMinimalGreeting);
  const vr = document.getElementById('voiceResponseToggle');
  if (vr) vr.addEventListener('change', toggleVoiceResponse);
  const ht = document.getElementById('hapticToggle');
  if (ht) ht.addEventListener('change', toggleHaptic);

  const tp = document.getElementById('turmaPerfil');
  if (tp) tp.addEventListener('change', salvarDadosPerfil);
  const ap = document.getElementById('anoPerfil');
  if (ap) ap.addEventListener('change', salvarDadosPerfil);

  const bf = document.getElementById('backupFileInput');
  if (bf) bf.addEventListener('change', handleBackupFile);

  const pdt = document.getElementById('pesquisaDataTexto');
  if (pdt) {
    pdt.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); pesquisarData(); }
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (activeModalElement) closeAllModals();
      else if (document.getElementById('hamburgerDrawer').classList.contains('open')) closeHamburger();
    }
  });

  bindCalendarioDelegation();
}

/* ============================================================
   25) INIT
   ============================================================ */
(function init() {
  const savedTurma = getStorageValue('braun_turma_perfil');
  if (savedTurma) {
    let region, grupo;
    if (['A','B','C','D'].indexOf(savedTurma) > -1) {
      region = 'BR';
      grupo = (savedTurma === 'A' || savedTurma === 'C') ? 'AC' : 'BD';
    } else if (savedTurma.indexOf('1x1') === 0) {
      region = '1x1';
      grupo = savedTurma;
    } else {
      region = 'MNT';
      grupo = (savedTurma === 'E' || savedTurma === 'G') ? 'EG' : 'FH';
    }
    currentRegion = region;
    currentTurma = grupo;
    setStorageValue('braun_last_region', region);
    setStorageValue('braun_turma_' + region, grupo);
  } else {
    const savedRegion = getStorageValue('braun_last_region') || 'BR';
    currentRegion = savedRegion;
    if (savedRegion === '1x1') currentTurma = getStorageValue('braun_turma_1x1') || '1x1A';
    else currentTurma = getStorageValue('braun_turma_' + savedRegion) || (savedRegion === 'BR' ? 'AC' : 'EG');
  }
  document.querySelectorAll('.tab').forEach(function (t) { t.classList.remove('active'); });
  const activeTab = document.getElementById('tab-' + currentRegion);
  if (activeTab) { activeTab.classList.add('active'); activeTab.setAttribute('aria-selected', 'true'); }
})();

window.addEventListener('load', function () {
  const visited = getStorageValue('braun_visited');
  const welcome = document.getElementById('welcomeScreen');
  welcome.style.display = visited ? 'none' : 'flex';

  bindAll();
  startClock();
  tick();
  atualizarLegenda1x1();
  gerarCalendario();
  atualizarBadgeTurma();
  preencherDadosModais();
  atualizarNovidadesUI();
  atualizarTituloMes();
  atualizarBannerAvisos();
});