import { mock } from './mock.js';
import { heatIndexC, bandFor } from './heat.js';
import { COMPANIONS, mountCompanion, cheer, setPace } from './companion.js';
import { renderSunArc, sunLabel } from './sun.js';
import { startTablet, renderTablet, capabilities } from './tablet.js';
import { burst, setRoll, keepAwake } from './fx.js';
import { heartbeat, icon } from './icons.js';
import { createPomo, renderPomo, updatePomoLive, primeAudio, chime, mmss } from './pomo.js';
import { loadConfig, saveConfig, resetConfig } from './config.js';
import { loadWeather } from './weather.js';
import { assessFlood } from './flood.js';
import { loadBackend, loadCamera, summarize } from './backend.js';
import { sampleModel, fromBackend, dateKey } from './model.js';
import { renderToday, renderTasks, renderWriting, renderFocus, renderResearch, FOCUS_GOAL_MIN, renderCamera, renderPrinter, camAge, CAM_FRESH_MIN } from './cards.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);

const state = {
  cfg: loadConfig(),
  hourly: { temp: mock.hourly.temp, rh: mock.hourly.rh },
  weatherSource: 'sample',
  flood: { state: mock.links.flood, total: 0, peak: 0 },
  backend: null, // raw feed once connected
  model: sampleModel(),
  cam: null, // { image, at } from the camera script, once the data link is connected
  lastBackendAt: null,
  lastWeatherAt: null,
  rainSoon: false,
  heatNow: 0,
  moodKey: '',
  camShown: null, // timestamp of the picture currently on screen, to fade only when a new one arrives
  prevTasks: null,
  prevFocus: null,
  awake: null,
};
if (params.get('laptop') === 'asleep') mock.links.laptop = 'asleep';
const laptopOnline = () => mock.links.laptop !== 'asleep';
if (!laptopOnline()) { mock.links.camera = 'resting'; mock.links.printer = 'idle'; }

/* ---------- theme: ?theme= overrides the saved setting ---------- */
function applyTheme() {
  const want = params.get('theme') || state.cfg.theme || 'light';
  const night = want === 'night' || (want === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = night ? 'night' : 'light';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = night ? '#14141C' : '#F4F0E8';
}

/* ---------- motion switches live on <html> so CSS can react ---------- */
function applyMotion() {
  const c = state.cfg, d = document.documentElement.dataset;
  const set = (k, on) => { if (on) delete d[k]; else d[k] = 'off'; };
  if (c.cardStyle && c.cardStyle !== 'off') d.tint = c.cardStyle; else delete d.tint;
  set('motion', c.motion); set('mIcons', c.mIcons); set('mAmbient', c.mAmbient); set('mSun', c.mSun);
}

/* ---------- scale the 1920x1080 stage to the screen ---------- */
function fit() {
  const s = Math.min(innerWidth / 1920, innerHeight / 1080);
  const stage = $('stage');
  stage.style.transform = `scale(${s})`;
  stage.style.left = `${(innerWidth - 1920 * s) / 2}px`;
  stage.style.top = `${(innerHeight - 1080 * s) / 2}px`;
}

/* ---------- header text ---------- */
const fmtTime = (d) => {
  const h = d.getHours() % 12 || 12;
  return `${h}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() >= 12 ? 'PM' : 'AM'}`;
};

function sublineText(now) {
  if (state.model.source === 'sample') {
    return state.cfg.backend ? 'Connecting to your data link…' : 'Sample data · open settings to connect your calendar and Sheet';
  }
  const m = state.model;
  const upcoming = m.events.filter((e) => !e.allDay && e.start > now)[0];
  const left = m.tasks.length;
  const tasks = `${left} task${left === 1 ? '' : 's'} open`;
  return upcoming ? `${tasks} · Next up: ${upcoming.title} at ${fmtTime(upcoming.start)}` : `${tasks} · Nothing else scheduled today`;
}

function flourish() {
  const c = document.querySelector('.clock');
  c.classList.remove('flourish'); void c.offsetWidth; c.classList.add('flourish');
  setTimeout(() => c.classList.remove('flourish'), 3200);
}
function renderNextEvent() { put('card-today', renderToday(state.model, new Date(), sunLabel(new Date(), state.cfg.lat, state.cfg.lon))); }

function tick() {
  const now = new Date();
  let h = now.getHours();
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  const mm = String(now.getMinutes()).padStart(2, '0');
  setRoll($('clock-h'), String(h));
  setRoll($('clock-m'), mm);
  $('clock-ap').textContent = ap;
  if (now.getMinutes() === 0 && state.lastMin != null && state.lastMin !== 0) flourish();
  if (state.lastMin !== now.getMinutes()) {
    $('sunarc').innerHTML = renderSunArc(now, state.cfg.lat, state.cfg.lon);
    if (state.lastMin != null) renderNextEvent();
  }
  state.lastMin = now.getMinutes();
  $('clock-date').textContent = now.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });

  const hr = now.getHours();
  const part = hr < 12 ? 'morning' : hr < 18 ? 'afternoon' : 'evening';
  $('greeting').textContent = `Good ${part}${state.cfg.name ? ', ' + state.cfg.name : ''}`;
  $('subline').textContent = sublineText(now);
  renderHeat(now);
}

/* ---------- status pills ---------- */
const PILL_COLORS = { ok: 'var(--mint-d)', busy: 'var(--orange)', off: 'var(--muted)', watch: 'var(--butter)', warning: 'var(--pink-d)' };
function camMode(now = new Date()) {
  if (!state.cfg.backend) return 'sample';
  const c = state.cam;
  return c && c.image && c.at && (now - c.at) / 60000 <= CAM_FRESH_MIN ? 'live' : 'resting';
}
function cameraPill(l) {
  const m = camMode();
  if (m === 'sample') return ['Camera', l.camera, l.camera === 'linked' ? 'ok' : 'off'];
  return ['Camera', m === 'live' ? 'linked' : 'resting', m === 'live' ? 'ok' : 'off'];
}
function dataMode(now = Date.now()) {
  if (!state.cfg.backend || state.model.source === 'sample') return 'sample';
  return state.lastBackendAt && (now - state.lastBackendAt) / 60000 <= 15 ? 'live' : 'stale';
}
function renderPills() {
  const l = mock.links; // laptop and printer stay sample until the local agent exists
  const f = state.flood;
  const floodText = f.state === 'normal' ? 'normal' : `${f.state} · ${f.total} mm/24h`;
  const dm = dataMode();
  const items = [
    ['Laptop', l.laptop, l.laptop === 'asleep' ? 'off' : 'ok'],
    cameraPill(l),
    ['Printer', l.printer, l.printer === 'printing' ? 'busy' : 'off'],
    ['Flood watch', floodText, f.state === 'normal' ? 'ok' : f.state],
  ];
  const dots = items.map(([name, text, tone]) =>
    `<div class="pill"><span class="dt${tone === 'ok' ? ' breathe' : ''}" style="background:${PILL_COLORS[tone]}"></span>${name}<span class="s">${text}</span></div>`
  ).join('');
  $('pills').innerHTML = dots + `<div class="pill">${heartbeat(dm)}Data<span class="s">${dm}</span></div>`;
}

/* ---------- heat index widget ---------- */
const Y_MIN = 26, Y_MAX = 46, H = 70;
const yOf = (v) => H - ((Math.min(Math.max(v, Y_MIN), Y_MAX) - Y_MIN) / (Y_MAX - Y_MIN)) * H;
const BAND_FILL = { caution: 'var(--mint-soft)', xcaution: 'var(--butter-soft)', danger: 'var(--orange-soft)' };

function renderHeat(now) {
  const { temp, rh } = state.hourly;
  const hi = temp.map((t, i) => heatIndexC(t, rh[i]));
  const xs = hi.map((_, i) => (i / 23) * 360);
  const pts = hi.map((v, i) => `${xs[i].toFixed(2)},${yOf(v).toFixed(2)}`);

  const y27 = yOf(27), y33 = yOf(33), y42 = yOf(42);
  $('heat-svg').innerHTML = `
    <rect x="0" y="${y33}" width="360" height="${y27 - y33}" fill="${BAND_FILL.caution}"/>
    <rect x="0" y="${y42}" width="360" height="${y33 - y42}" fill="${BAND_FILL.xcaution}"/>
    <rect x="0" y="0" width="360" height="${y42}" fill="${BAND_FILL.danger}"/>
    <path d="M${pts.join(' ')} 360,${H} 0,${H}Z" fill="var(--orange)" fill-opacity="0.18"/>
    <polyline points="${pts.join(' ')}" fill="none" stroke="var(--orange-text)" stroke-width="2.6"
      stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`;

  const f = now.getHours() + now.getMinutes() / 60;
  const i0 = Math.min(Math.floor(f), 22), t = f - i0;
  const lerp = (a) => a[i0] + (a[i0 + 1] - a[i0]) * t;
  const cur = lerp(hi);
  const dot = $('heat-dot');
  dot.style.left = `${((f / 23) * 100)}%`;
  dot.style.top = `${(yOf(cur) / H) * 100}%`;

  const band = bandFor(cur);
  setRoll($('heat-now'), `${Math.round(cur)}°`);
  state.heatNow = cur;
  $('heat').classList.toggle('shimmer', !!state.cfg.mMoods && cur >= 33);
  updateMood();
  $('heat-band').textContent = band.label;
  $('heat-band').style.background = band.cls === 'danger' ? 'var(--orange-soft)' : band.cls === 'xcaution' ? 'var(--butter-soft)' : band.cls === 'caution' ? 'var(--mint-soft)' : 'var(--soft)';
  $('heat-air').textContent = `Air ${Math.round(lerp(temp))}° · ${Math.round(lerp(rh))}%`;

  const peakVal = Math.max(...hi), peakIdx = hi.indexOf(peakVal);
  const pd = $('heat-peak-dot');
  pd.style.left = `${(xs[peakIdx] / 360) * 100}%`;
  pd.style.top = `${(yOf(peakVal) / H) * 100}%`;
  const pe = $('heat-peak');
  pe.textContent = `Peak ${Math.round(peakVal)}° · ${peakIdx % 12 || 12} ${peakIdx >= 12 ? 'PM' : 'AM'}`;
  // keep the label inside the card when the peak is late in the day
  const px = (xs[peakIdx] / 360) * 100;
  if (px > 62) { pe.style.left = 'auto'; pe.style.right = `${100 - px + 3}%`; } else { pe.style.right = 'auto'; pe.style.left = `${px + 3}%`; }
}

/* ---------- companion: mood and reactions ---------- */
function mountCmp() {
  state.moodKey = '';
  mountCompanion($('companion'), state.cfg.companion);
  updateMood();
  if (pomo.s.running && pomo.s.phase === 'focus') setPace($('companion'), 1.8);
}
function updateMood() {
  const el = $('companion');
  const sweat = state.cfg.mMoods && state.heatNow >= 42;
  const rain = state.cfg.mMoods && state.rainSoon;
  const key = `${sweat ? 1 : 0}${rain ? 1 : 0}`;
  if (key === state.moodKey) return;
  state.moodKey = key;
  el.querySelectorAll('.mood').forEach((n) => n.remove());
  if (sweat) el.insertAdjacentHTML('beforeend', '<i class="mood mood-sweat"></i><i class="mood mood-sweat b"></i>');
  if (rain) el.insertAdjacentHTML('beforeend', '<i class="mood mood-umb"></i><div class="mood mood-drops">' + [10, 34, 58, 82, 106, 130].map((x, i) => `<i style="left:${x}px;animation-delay:${(-i * 0.21).toFixed(2)}s"></i>`).join('') + '</div>');
}

/* ---------- cards ---------- */
// minutes finished with the built-in timer on this tablet are added to today's focus
function withLocalFocus(m) {
  const log = pomo.log(), now = new Date();
  const week = m.focus.week.slice();
  for (let i = 0; i < 7; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - i));
    week[i] += log[dateKey(d)] || 0;
  }
  return { ...m, focus: { todayMin: week[6], week } };
}
const put = (id, html) => { $(id).innerHTML = html; };
function renderBoard() {
  const now = new Date(), m = withLocalFocus(state.model), c = state.cfg;
  const on = pomo.s.active;
  put('card-today', renderToday(m, now, sunLabel(now, c.lat, c.lon)));
  put('card-tasks', renderTasks(m));
  const wOn = c.tileWriting && !on, fOn = c.tileFocus && !on;
  $('tile-writing').hidden = !wOn;
  $('tile-focus').hidden = !fOn;
  if (wOn) put('tile-writing', renderWriting(m, now));
  if (fOn) put('tile-focus', renderFocus(m, now));
  const n = (wOn ? 1 : 0) + (fOn ? 1 : 0);
  $('tile-tablet').className = `tile tile-tab d${n}`;
  renderTabletTile();
  $('card-research').hidden = on;
  if (!on) put('card-research', renderResearch(m, now, [4, 3, 2][n]));
}
function renderTabletTile() {
  const c = state.cfg, cam = state.cam;
  const live = c.backend ? 'live' : 'sample';
  put('tile-tablet', renderTablet({
    awake: state.awake && state.awake.supported ? state.awake.on : null,
    feeds: [
      { name: 'Calendar', at: state.lastBackendAt, maxMin: 15, mode: live },
      { name: 'Camera', at: cam && cam.at, maxMin: CAM_FRESH_MIN, mode: live, soft: true },
      { name: 'Weather', at: state.lastWeatherAt, maxMin: 45, mode: state.weatherSource === 'sample' ? 'sample' : 'live' },
    ],
  }));
}
function renderCam() {
  const mode = camMode(), c = state.cam || {};
  const stamp = c.at ? +c.at : null;
  const fade = mode === 'live' && stamp && state.camShown && stamp !== state.camShown;
  if (mode === 'live') state.camShown = stamp;
  put('card-camera', renderCamera({ mode, online: laptopOnline(), image: c.image, at: c.at, fade }));
}
function renderMid() {
  renderCam();
  put('card-printer', renderPrinter(laptopOnline()));
}

/* ---------- focus timer ---------- */
const pomo = createPomo({
  onChange: () => syncPomo(),
  onPhaseEnd: (was, now) => {
    if (state.cfg.pomoChime) chime(was === 'focus' ? 'break' : 'work');
    cheer($('companion'));
    if (was === 'focus') { burst($('card-pomo'), 20); withLocalFocusRefresh(); }
  },
});
function withLocalFocusRefresh() { renderBoard(); }
let pomoWasOn = false, pomoSig = '';
function syncPomo() {
  const s = pomo.s, on = s.active;
  $('stage').classList.toggle('pomo-on', on);
  $('board').classList.toggle('pm-on', on);
  $('card-pomo').hidden = !on;
  $('pomo-btn').classList.toggle('on', on);
  $('pomo-ic').innerHTML = icon('tomato', 22, on ? 'tom' : '');
  if (on) {
    const sig = [s.phase, s.idx, s.running, s.len.focus, s.len.short, s.len.long, s.endsAt].join('|');
    if (sig !== pomoSig) { pomoSig = sig; put('card-pomo', renderPomo(pomo)); }
    setPace($('companion'), s.running && s.phase === 'focus' ? 1.8 : 1);
  } else if (pomoWasOn) { pomoSig = ''; setPace($('companion'), 1); }
  $('pomo-lab').textContent = on ? (s.running ? mmss(pomo.left()) : 'Paused') : 'Focus';
  if (on !== pomoWasOn) { pomoWasOn = on; renderBoard(); }
}
$('pomo-btn').addEventListener('click', () => { primeAudio(); if (!pomo.s.active) pomo.open(); });
$('card-pomo').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  primeAudio();
  if (b.dataset.act === 'toggle') pomo.s.running ? pomo.toggle() : pomo.start();
  else if (b.dataset.act === 'skip') pomo.skip();
  else if (b.dataset.act === 'end') { /* needs a long press, see below */ }
  else if (b.dataset.step) { const [k, d] = b.dataset.step.split(':'); pomo.step(k, +d); }
  else if (b.dataset.preset) pomo.preset(b.dataset.preset);
});
// hold to end: press and keep pressed for 1.2 s
let holdT = null;
const holdBtn = () => $('card-pomo').querySelector('.btn.hold');
$('card-pomo').addEventListener('pointerdown', (e) => {
  const b = e.target.closest('.btn.hold'); if (!b) return;
  b.classList.add('holding');
  holdT = setTimeout(() => { holdT = null; pomo.end(); }, 1200);
});
const cancelHold = () => { clearTimeout(holdT); holdT = null; const b = holdBtn(); if (b) b.classList.remove('holding'); };
['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => $('card-pomo').addEventListener(ev, cancelHold));
setInterval(() => { pomo.tick(); if (pomo.s.active) { updatePomoLive(pomo); $('pomo-lab').textContent = pomo.s.running ? mmss(pomo.left()) : 'Paused'; } }, 1000);

/* ---------- ask bar: opens Claude with your question ---------- */
$('ask').addEventListener('submit', (e) => {
  e.preventDefault();
  const q = $('ask-input').value.trim();
  if (!q) return;
  window.open(`https://claude.ai/new?q=${encodeURIComponent(q)}`, '_blank', 'noopener');
  $('ask-input').value = '';
});

/* ---------- data refresh ---------- */
async function refreshWeather() {
  const w = await loadWeather(state.cfg, { temp: mock.hourly.temp, rh: mock.hourly.rh, precipFull: new Array(48).fill(0) });
  state.hourly = { temp: w.temp, rh: w.rh };
  state.weatherSource = w.source;
  state.lastWeatherAt = w.source === 'live' ? Date.now() : (w.at || null);
  const nowH = new Date().getHours();
  state.rainSoon = w.precipFull.slice(nowH, nowH + 3).reduce((a, b) => a + b, 0) >= 1;
  state.flood = assessFlood(w.precipFull.slice(nowH, nowH + 24));
  renderPills();
  renderTabletTile();
  tick();
}

// the companion cheers and beads burst when something got done since the last refresh
function reactions() {
  const m = state.model;
  if (m.source !== 'live') { state.prevTasks = null; state.prevFocus = null; return; }
  const now = new Set(m.tasks.map((t) => t.title));
  if (state.prevTasks) {
    const finished = [...state.prevTasks].filter((t) => !now.has(t)).length;
    if (finished) { cheer($('companion')); burst($('card-tasks'), 10 + finished * 4); }
  }
  state.prevTasks = now;
  const f = m.focus.todayMin;
  if (state.prevFocus != null && state.prevFocus < FOCUS_GOAL_MIN && f >= FOCUS_GOAL_MIN) { cheer($('companion')); burst($('companion'), 22); }
  state.prevFocus = f;
}

async function refreshBackend() {
  const r = await loadBackend(state.cfg);
  state.backend = r.ok ? r.data : null;
  state.model = r.ok ? fromBackend(r.data) : sampleModel();
  if (r.ok && r.source === 'live') state.lastBackendAt = Date.now();
  reactions();
  renderBoard();
  renderPills();
  tick();
  return r;
}

async function refreshCamera() {
  if (!state.cfg.backend) { state.cam = null; renderCam(); renderPills(); return; }
  const r = await loadCamera(state.cfg);
  if (r.ok) state.cam = { image: r.image, at: r.at };
  renderCam(); renderPills();
}
// keep "updated N min ago" and the fresh/resting switch honest between fetches
function ageTick() {
  const el = document.getElementById('cam-age');
  const c = state.cam;
  if (camMode() === 'live' && el && c) el.textContent = camAge(c.at);
  else if (state.cfg.backend && !el) { /* already resting */ }
  else if (state.cfg.backend && el) { renderCam(); renderPills(); } // just went stale
}

/* ---------- settings ---------- */
const form = $('settings-form');
function buildPicker(current) {
  const box = $('cpick');
  box.innerHTML = COMPANIONS.map((cp) =>
    `<label><input type="radio" name="companion" value="${cp.id}"${cp.id === current ? ' checked' : ''}><div class="cv"><div data-k="${cp.id}"></div></div><b>${cp.name}</b><small>${cp.blurb}</small></label>`).join('');
  box.querySelectorAll('[data-k]').forEach((d) => mountCompanion(d, d.dataset.k));
}
function openSettings() {
  const c = state.cfg;
  $('f-name').value = c.name;
  $('f-theme').value = c.theme;
  buildPicker(c.companion);
  $('f-cardstyle').value = c.cardStyle;
  $('f-motion').checked = c.motion; $('f-micons').checked = c.mIcons; $('f-mambient').checked = c.mAmbient;
  $('f-msun').checked = c.mSun; $('f-mmoods').checked = c.mMoods;
  $('f-pchime').checked = c.pomoChime;
  $('f-twriting').checked = c.tileWriting; $('f-tfocus').checked = c.tileFocus;
  $('caps').innerHTML = capabilities().map(([n, ok]) => `<span class="rchip${ok ? '' : ' no'}">${n}</span>`).join('');
  $('f-lat').value = c.lat;
  $('f-lon').value = c.lon;
  $('f-backend').value = c.backend;
  $('f-token').value = c.token;
  $('test-result').textContent = '';
  $('settings').hidden = false;
  $('f-name').focus();
}
const closeSettings = () => { $('settings').hidden = true; $('open-settings').focus(); };

function readForm() {
  const num = (v, d) => (Number.isFinite(parseFloat(v)) ? parseFloat(v) : d);
  return {
    name: $('f-name').value.trim(),
    theme: $('f-theme').value,
    lat: num($('f-lat').value, state.cfg.lat),
    lon: num($('f-lon').value, state.cfg.lon),
    backend: $('f-backend').value.trim(),
    token: $('f-token').value.trim(),
    companion: (document.querySelector('input[name="companion"]:checked') || {}).value || state.cfg.companion,
    cardStyle: $('f-cardstyle').value,
    motion: $('f-motion').checked, mIcons: $('f-micons').checked, mAmbient: $('f-mambient').checked,
    mSun: $('f-msun').checked, mMoods: $('f-mmoods').checked,
    pomoChime: $('f-pchime').checked,
    tileWriting: $('f-twriting').checked, tileFocus: $('f-tfocus').checked,
  };
}

function say(msg, cls) {
  const el = $('test-result');
  el.innerHTML = '';
  const s = document.createElement('span');
  s.className = cls || '';
  s.textContent = msg;
  el.appendChild(s);
}

$('open-settings').addEventListener('click', openSettings);
$('s-cancel').addEventListener('click', closeSettings);
$('settings').addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSettings(); });
$('s-reset').addEventListener('click', () => {
  state.cfg = resetConfig();
  state.backend = null;
  state.model = sampleModel();
  state.cam = null;
  applyTheme(); applyMotion(); mountCmp(); renderBoard(); renderCam(); renderPills(); openSettings(); refreshWeather(); tick();
});
$('s-test').addEventListener('click', async () => {
  say('Testing…');
  const cfg = readForm();
  const r = await loadBackend(cfg);
  if (r.ok && r.source === 'live') say(`Connected · ${summarize(r.data)}`, 'good');
  else if (r.ok) say(`Could not reach the link, showing the last saved copy (${r.error})`, 'bad');
  else say(r.reason === 'not-configured' ? 'Paste the data link first.' : `Failed: ${r.reason}`, 'bad');
});
form.addEventListener('submit', (e) => {
  e.preventDefault();
  state.cfg = readForm();
  if (!saveConfig(state.cfg)) say('Could not save on this device.', 'bad');
  applyTheme(); applyMotion(); mountCmp(); renderBoard(); renderPills(); tick();
  closeSettings();
  refreshWeather();
  refreshBackend();
  refreshCamera();
});

/* ---------- boot ---------- */
applyTheme();
applyMotion();
fit();
addEventListener('resize', fit);
mountCmp();
syncPomo();
$('board').classList.add('boot');
setTimeout(() => $('board').classList.remove('boot'), 2000);
state.awake = keepAwake(renderTabletTile);
startTablet(renderTabletTile);
renderPills();
renderBoard();
renderMid();
tick();
setInterval(tick, 10000);
setInterval(renderBoard, 60000);
setInterval(renderTabletTile, 30000);
refreshWeather();
refreshBackend();
refreshCamera();
setInterval(ageTick, 30 * 1000);
setInterval(refreshCamera, 60 * 1000);
setInterval(refreshWeather, 15 * 60 * 1000);
setInterval(refreshBackend, 5 * 60 * 1000);

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => { /* app still works without it */ });
}
