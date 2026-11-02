// Tablet health panel. Reads only what a web page is allowed to see on this device.
// Not available to a web page: CPU load and temperature. "Memory" is this page's own memory, "Storage" is this app's storage.
import { icon } from './icons.js';
import { esc } from './cards.js';

const KEY = 'cs.bat.v1';
const SAMPLE_EVERY = 10 * 60 * 1000;
const KEEP = 24 * 3600 * 1000;

let bat = null;
let history = [];
let storage = null;
try { history = JSON.parse(localStorage.getItem(KEY) || '[]').filter((p) => Array.isArray(p)); } catch { history = []; }

const save = () => { try { localStorage.setItem(KEY, JSON.stringify(history)); } catch { /* storage unavailable */ } };

function record() {
  if (!bat) return;
  const now = Date.now();
  const last = history[history.length - 1];
  if (!last || now - last[0] >= SAMPLE_EVERY) history.push([now, Math.round(bat.level * 100), bat.charging ? 1 : 0]);
  history = history.filter((p) => now - p[0] <= KEEP);
  save();
}

/* Starts listening. onChange is called whenever a reading changes. */
export function startTablet(onChange) {
  if (navigator.getBattery) {
    navigator.getBattery().then((b) => {
      bat = b;
      const upd = () => { record(); onChange(); };
      upd();
      ['levelchange', 'chargingchange', 'chargingtimechange', 'dischargingtimechange'].forEach((ev) => b.addEventListener(ev, upd));
      setInterval(upd, SAMPLE_EVERY);
    }).catch(() => {});
  }
  const refreshStorage = () => {
    if (navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then((e) => { storage = e; onChange(); }).catch(() => {});
    }
  };
  refreshStorage();
  setInterval(refreshStorage, 10 * 60 * 1000);
  const c = navigator.connection;
  if (c && c.addEventListener) c.addEventListener('change', onChange);
  addEventListener('online', onChange);
  addEventListener('offline', onChange);
}

/* What this device lets the page read, for the Settings chips. */
export function capabilities() {
  return [
    ['Battery', !!navigator.getBattery],
    ['Network', !!navigator.connection || 'onLine' in navigator],
    ['Memory', !!(performance && performance.memory)],
    ['Storage', !!(navigator.storage && navigator.storage.estimate)],
    ['Screen lock', 'wakeLock' in navigator],
  ];
}

const mb = (n) => (n >= 1024 ** 3 ? `${(n / 1024 ** 3).toFixed(1)} GB` : `${Math.round(n / 1024 ** 2)} MB`);
function duration(ms) {
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m} m`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h} h ${m % 60} m`;
  return `${Math.floor(h / 24)} d ${h % 24} h`;
}
const ago = (t, now) => {
  if (!t) return null;
  const m = Math.max(0, Math.round((now - t) / 60000));
  return m < 1 ? 'just now' : m < 60 ? `${m} min` : `${Math.floor(m / 60)} h`;
};

function spark(now) {
  const pts = history.filter((p) => now - p[0] <= KEEP);
  if (pts.length < 2) return '<div class="muted small" style="padding:6px 0">History builds up as the day goes on</div>';
  const t0 = pts[0][0], span = Math.max(now - t0, 1);
  const xy = pts.map((p) => `${(((p[0] - t0) / span) * 296 + 2).toFixed(1)},${(36 - (p[1] / 100) * 32).toFixed(1)}`);
  const lastX = xy[xy.length - 1].split(',');
  return `<svg width="100%" height="40" viewBox="0 0 300 40" preserveAspectRatio="none" role="img" aria-label="Battery level over the last 24 hours">
    <path d="M${xy.join(' ')} 298,38 ${xy[0].split(',')[0]},38Z" style="fill:var(--ia);opacity:0.18"/>
    <polyline points="${xy.join(' ')}" fill="none" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" style="stroke:var(--ia)"/></svg>
    <span class="spark-dot" style="left:calc(${(+lastX[0] / 300) * 100}% - 5px);top:${lastX[1]}px"></span>`;
}

/* feeds: [{ name, at (Date|null), maxMin, mode: 'live'|'sample'|'off', soft (stale is fine, e.g. camera) }] */
export function renderTablet({ feeds = [], awake = null, now = new Date() } = {}) {
  const t = now.getTime();
  const online = navigator.onLine !== false;
  const c = navigator.connection || {};
  const level = bat ? Math.round(bat.level * 100) : null;
  const charging = !!(bat && bat.charging);

  let batSub = 'Battery reading not available';
  if (bat) {
    if (charging) batSub = Number.isFinite(bat.chargingTime) && bat.chargingTime > 0 ? `Charging · full in ${duration(bat.chargingTime * 1000)}` : 'Charging';
    else batSub = Number.isFinite(bat.dischargingTime) && bat.dischargingTime > 0 ? `On battery · ${duration(bat.dischargingTime * 1000)} left` : 'On battery';
  }

  const net = !online ? 'Offline' : c.effectiveType ? `Online · ${String(c.effectiveType).toUpperCase()}${c.downlink ? ` · ${c.downlink} Mbps` : ''}` : 'Online';
  const mem = performance && performance.memory ? performance.memory : null;
  const memTxt = mem ? mb(mem.usedJSHeapSize) : 'n/a';
  const memPct = mem ? Math.min(100, Math.round((mem.usedJSHeapSize / mem.jsHeapSizeLimit) * 100)) : 0;
  const stTxt = storage && storage.quota ? `${mb(storage.usage || 0)} of ${mb(storage.quota)}` : 'n/a';
  const stPct = storage && storage.quota ? Math.min(100, Math.round(((storage.usage || 0) / storage.quota) * 100)) : 0;

  const chips = feeds.map((f) => {
    const stale = f.mode === 'live' && f.at && (t - f.at) / 60000 > f.maxMin;
    const tone = f.mode === 'off' || f.mode === 'sample' ? 'off' : f.soft && (!f.at || stale) ? 'off' : (!f.at || stale) ? 'bad' : 'ok';
    const txt = f.mode === 'sample' ? 'sample' : f.mode === 'off' ? 'off' : ago(f.at, t) || 'waiting';
    return `<span class="fchip ${tone}"><i></i>${esc(f.name)}<b>${esc(txt)}</b></span>`;
  }).join('');

  const feedBad = feeds.some((f) => !f.soft && f.mode === 'live' && f.at && (t - f.at) / 60000 > f.maxMin);
  const lowBat = bat && !charging && level <= 20;
  const ok = online && !lowBat && !feedBad;
  const why = !online ? 'Offline' : lowBat ? 'Low battery' : feedBad ? 'Stale feed' : 'Healthy';

  return `<div class="row" style="gap:10px"><h2 class="h2 hi">${icon('tablet', 32, 'ink')}Tablet</h2><span class="grow"></span><span class="hbadge ${ok ? 'ok' : 'bad'}"><i></i>${why}</span></div>
    <div class="bat-row"><div class="bat big${charging ? ' chg' : ''}">${level == null ? '–' : level + '<small>%</small>'}</div><div class="bat-meta"><span>${esc(batSub)}</span><span class="muted-on-ink">${awake === true ? 'Screen kept awake' : awake === false ? 'Screen may sleep' : ''}</span></div></div>
    <div class="spark">${spark(t)}</div>
    <div class="rdgs">
      <div class="rd"><span>Network</span><b>${esc(net)}</b></div>
      <div class="rd"><span>App memory</span><div class="trk"><i style="width:${memPct}%;background:var(--mint)"></i></div><b>${esc(memTxt)}</b></div>
      <div class="rd"><span>App storage</span><div class="trk"><i style="width:${stPct}%;background:var(--butter)"></i></div><b>${esc(stTxt)}</b></div>
      <div class="rd"><span>Running</span><b>${duration(performance.now())}</b></div>
    </div>
    <div class="fchips">${chips}</div>`;
}
