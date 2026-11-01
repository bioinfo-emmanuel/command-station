import { mock } from './mock.js';
import { heatIndexC, bandFor } from './heat.js';
import { mountDna } from './companion.js';
import { loadConfig, saveConfig, resetConfig } from './config.js';
import { loadWeather } from './weather.js';
import { assessFlood } from './flood.js';
import { loadBackend, loadCamera, summarize } from './backend.js';
import { sampleModel, fromBackend } from './model.js';
import { renderToday, renderTasks, renderWriting, renderFocus, renderDevice, renderResearch, renderCamera, renderPrinter, camAge, CAM_FRESH_MIN } from './cards.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);

const state = {
  cfg: loadConfig(),
  hourly: { temp: mock.hourly.temp, rh: mock.hourly.rh },
  weatherSource: 'sample',
  flood: { state: mock.links.flood, total: 0, peak: 0 },
  backend: null, // raw feed once connected
  model: sampleModel(),
  deviceTab: 'laptop',
  battery: null,
  cam: null, // { image, at } from the camera script, once the data link is connected
};
if (params.get('laptop') === 'asleep') mock.links.laptop = 'asleep';
const laptopOnline = () => mock.links.laptop !== 'asleep';
if (!laptopOnline()) { state.deviceTab = 'tablet'; mock.links.camera = 'resting'; mock.links.printer = 'idle'; }

/* ---------- theme: ?theme= overrides the saved setting ---------- */
function applyTheme() {
  const want = params.get('theme') || state.cfg.theme || 'light';
  const night = want === 'night' || (want === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = night ? 'night' : 'light';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = night ? '#14141C' : '#F4F0E8';
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

function tick() {
  const now = new Date();
  let h = now.getHours();
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  $('clock-hm').textContent = `${h}:${String(now.getMinutes()).padStart(2, '0')}`;
  $('clock-ap').textContent = ap;
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
function renderPills() {
  const l = mock.links; // laptop, camera and printer stay sample until the local agent exists
  const f = state.flood;
  const floodText = f.state === 'normal' ? 'normal' : `${f.state} · ${f.total} mm/24h`;
  const items = [
    ['Laptop', l.laptop, l.laptop === 'asleep' ? 'off' : 'ok'],
    cameraPill(l),
    ['Printer', l.printer, l.printer === 'printing' ? 'busy' : 'off'],
    ['Flood watch', floodText, f.state === 'normal' ? 'ok' : f.state],
  ];
  $('pills').innerHTML = items.map(([name, text, tone]) =>
    `<div class="pill"><span class="dt" style="background:${PILL_COLORS[tone]}"></span>${name}<span class="s">${text}</span></div>`
  ).join('');
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
  $('heat-now').textContent = `${Math.round(cur)}°`;
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

/* ---------- cards ---------- */
const put = (id, html) => { $(id).innerHTML = html; };
function renderBoard() {
  const now = new Date(), m = state.model;
  put('card-today', renderToday(m, now));
  put('card-tasks', renderTasks(m));
  put('tile-writing', renderWriting(m, now));
  put('tile-focus', renderFocus(m));
  renderDeviceTile();
  put('card-research', renderResearch(m, now));
}
function renderDeviceTile() { put('tile-device', renderDevice(state.deviceTab, state.battery, laptopOnline())); }
function renderCam() {
  const mode = camMode(), c = state.cam || {};
  put('card-camera', renderCamera({ mode, online: laptopOnline(), image: c.image, at: c.at }));
}
function renderMid() {
  renderCam();
  put('card-printer', renderPrinter(laptopOnline()));
}
$('tile-device').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-tab]');
  if (b) { state.deviceTab = b.dataset.tab; renderDeviceTile(); }
});
if (navigator.getBattery) {
  navigator.getBattery().then((bat) => {
    const upd = () => { state.battery = { level: bat.level, charging: bat.charging }; renderDeviceTile(); };
    upd(); bat.addEventListener('levelchange', upd); bat.addEventListener('chargingchange', upd);
  }).catch(() => {});
}

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
  const nowH = new Date().getHours();
  state.flood = assessFlood(w.precipFull.slice(nowH, nowH + 24));
  renderPills();
  tick();
}

async function refreshBackend() {
  const r = await loadBackend(state.cfg);
  state.backend = r.ok ? r.data : null;
  state.model = r.ok ? fromBackend(r.data) : sampleModel();
  renderBoard();
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
function openSettings() {
  const c = state.cfg;
  $('f-name').value = c.name;
  $('f-theme').value = c.theme;
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
  applyTheme(); renderBoard(); renderCam(); renderPills(); openSettings(); refreshWeather(); tick();
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
  applyTheme();
  closeSettings();
  refreshWeather();
  refreshBackend();
  refreshCamera();
});

/* ---------- boot ---------- */
applyTheme();
fit();
addEventListener('resize', fit);
mountDna($('companion'));
renderPills();
renderBoard();
renderMid();
tick();
setInterval(tick, 10000);
setInterval(renderBoard, 60000);
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
