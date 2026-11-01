import { mock } from './mock.js';
import { heatIndexC, bandFor } from './heat.js';
import { mountDna } from './companion.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);

/* ---------- theme: ?theme=light|night|auto ---------- */
function applyTheme() {
  const want = params.get('theme') || 'light';
  const night = want === 'night' || (want === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = night ? 'night' : 'light';
}

/* ---------- scale the 1920x1080 stage to the screen ---------- */
function fit() {
  const s = Math.min(innerWidth / 1920, innerHeight / 1080);
  const stage = $('stage');
  stage.style.transform = `scale(${s})`;
  stage.style.left = `${(innerWidth - 1920 * s) / 2}px`;
  stage.style.top = `${(innerHeight - 1080 * s) / 2}px`;
}

/* ---------- clock and greeting ---------- */
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
  $('greeting').textContent = `Good ${part}, ${mock.owner}`;
  $('subline').textContent = `${mock.tasksLeft} tasks left today · Next up: ${mock.nextEvent.title} at ${mock.nextEvent.time}`;
  renderHeat(now);
}

/* ---------- status pills ---------- */
const PILL_COLORS = { ok: 'var(--mint-d)', busy: 'var(--orange)', off: 'var(--muted)', watch: 'var(--butter)', warning: 'var(--pink-d)' };
function renderPills() {
  const l = mock.links;
  const asleep = l.laptop === 'asleep';
  const items = [
    ['Laptop', l.laptop, asleep ? 'off' : 'ok'],
    ['Camera', l.camera, l.camera === 'linked' ? 'ok' : 'off'],
    ['Printer', l.printer, l.printer === 'printing' ? 'busy' : 'off'],
    ['Flood watch', l.flood, l.flood === 'normal' ? 'ok' : l.flood],
  ];
  $('pills').innerHTML = items.map(([name, state, tone]) =>
    `<div class="pill"><span class="dt" style="background:${PILL_COLORS[tone]}"></span>${name}<span class="s">${state}</span></div>`
  ).join('');
}

/* ---------- heat index widget ---------- */
const Y_MIN = 26, Y_MAX = 46, H = 70;
const yOf = (v) => H - ((Math.min(Math.max(v, Y_MIN), Y_MAX) - Y_MIN) / (Y_MAX - Y_MIN)) * H;
const BAND_FILL = { caution: 'var(--mint-soft)', xcaution: 'var(--butter-soft)', danger: 'var(--orange-soft)' };

function renderHeat(now) {
  const hi = mock.hourly.temp.map((t, i) => heatIndexC(t, mock.hourly.rh[i]));
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

  // current value interpolated between hours
  const f = now.getHours() + now.getMinutes() / 60;
  const i0 = Math.min(Math.floor(f), 22), t = f - i0;
  const cur = hi[i0] + (hi[i0 + 1] - hi[i0]) * t;
  const nowX = (f / 23) * 360;
  const dot = $('heat-dot');
  dot.style.left = `${(nowX / 360) * 100}%`;
  dot.style.top = `${(yOf(cur) / H) * 100}%`;

  const band = bandFor(cur);
  $('heat-now').textContent = `${Math.round(cur)}°`;
  $('heat-band').textContent = band.label;
  $('heat-band').style.background = band.cls === 'danger' ? 'var(--orange-soft)' : band.cls === 'xcaution' ? 'var(--butter-soft)' : band.cls === 'caution' ? 'var(--mint-soft)' : 'var(--soft)';

  const air = mock.hourly.temp[i0] + (mock.hourly.temp[i0 + 1] - mock.hourly.temp[i0]) * t;
  const rh = mock.hourly.rh[i0] + (mock.hourly.rh[i0 + 1] - mock.hourly.rh[i0]) * t;
  $('heat-air').textContent = `Air ${Math.round(air)}° · ${Math.round(rh)}%`;

  const peakVal = Math.max(...hi), peakIdx = hi.indexOf(peakVal);
  const pd = $('heat-peak-dot');
  pd.style.left = `${(xs[peakIdx] / 360) * 100}%`;
  pd.style.top = `${(yOf(peakVal) / H) * 100}%`;
  const ph = peakIdx % 12 || 12;
  const pe = $('heat-peak');
  pe.textContent = `Peak ${Math.round(peakVal)}° · ${ph} ${peakIdx >= 12 ? 'PM' : 'AM'}`;
  pe.style.left = `${(xs[peakIdx] / 360) * 100 + 3}%`;
}

applyTheme();
fit();
addEventListener('resize', fit);
mountDna($('companion'));
renderPills();
tick();
setInterval(tick, 10000);
