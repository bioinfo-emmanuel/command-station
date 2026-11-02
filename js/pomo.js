// Pomodoro timer. All state lives on this device (localStorage); nothing is sent anywhere.
// Flow: Focus > short break ... > long break > repeat, until the whole session is ended with a long press.
import { icon } from './icons.js';
import { dateKey } from './model.js';

const KEY = 'cs.pomo.v1';
const LOG = 'cs.focuslog.v1';
export const PRESETS = [
  { id: 'classic', name: 'Classic', focus: 25, short: 5, long: 15, cycles: 4 },
  { id: 'short', name: 'Short', focus: 15, short: 3, long: 10, cycles: 4 },
  { id: 'deep', name: 'Deep', focus: 50, short: 10, long: 30, cycles: 3 },
];
const LIMITS = { focus: [5, 120, 5], short: [1, 30, 1], long: [5, 60, 5] };
const MIN = 60000;

const DEFAULT = () => ({ active: false, len: { focus: 25, short: 5, long: 15, cycles: 4 }, phase: 'focus', idx: 1, running: false, endsAt: 0, left: 25 * MIN });

export function createPomo(hooks = {}) {
  let s = DEFAULT();
  try { const raw = JSON.parse(localStorage.getItem(KEY) || 'null'); if (raw && raw.len) s = { ...DEFAULT(), ...raw, len: { ...DEFAULT().len, ...raw.len } }; } catch { /* start fresh */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage unavailable */ } };
  const full = (phase = s.phase) => s.len[phase] * MIN;
  const leftNow = () => (s.running ? Math.max(0, s.endsAt - Date.now()) : s.left);
  const emit = () => { save(); hooks.onChange && hooks.onChange(); };

  function logFocus(min) {
    if (min < 1) return;
    try {
      const log = JSON.parse(localStorage.getItem(LOG) || '{}');
      const k = dateKey(new Date());
      log[k] = (log[k] || 0) + Math.round(min);
      localStorage.setItem(LOG, JSON.stringify(log));
    } catch { /* storage unavailable */ }
  }

  function next(natural) {
    const was = s.phase;
    if (natural && was === 'focus') logFocus(s.len.focus);
    else if (!natural && was === 'focus') logFocus(Math.floor((full() - leftNow()) / MIN));
    if (was === 'focus') s.phase = s.idx >= s.len.cycles ? 'long' : 'short';
    else { if (was === 'long') s.idx = 1; else s.idx += 1; s.phase = 'focus'; }
    s.left = full();
    s.running = natural; // a natural end rolls straight into the next phase; a skip waits for you
    s.endsAt = natural ? Date.now() + s.left : 0;
    if (natural && hooks.onPhaseEnd) hooks.onPhaseEnd(was, s.phase);
    emit();
  }

  const api = {
    get s() { return s; },
    left: leftNow,
    full,
    start() { s.active = true; if (!s.running) { s.running = true; s.endsAt = Date.now() + s.left; } emit(); },
    open() { s.active = true; emit(); },
    toggle() { if (s.running) { s.left = leftNow(); s.running = false; } else { s.running = true; s.endsAt = Date.now() + s.left; } emit(); },
    skip() { next(false); },
    end() {
      if (s.phase === 'focus') logFocus(Math.floor((full() - leftNow()) / MIN));
      s = { ...DEFAULT(), len: s.len };
      emit();
    },
    tick() { if (s.active && s.running && Date.now() >= s.endsAt) next(true); },
    step(kind, dir) {
      const [lo, hi, st] = LIMITS[kind];
      s.len[kind] = Math.min(hi, Math.max(lo, s.len[kind] + dir * st));
      if (!s.running && s.phase === kind) s.left = full(); // idle or paused on that phase: reflect it right away
      emit();
    },
    preset(id) {
      const p = PRESETS.find((x) => x.id === id);
      if (!p) return;
      s.len = { focus: p.focus, short: p.short, long: p.long, cycles: p.cycles };
      if (!s.running) s.left = full();
      emit();
    },
    log() { try { return JSON.parse(localStorage.getItem(LOG) || '{}'); } catch { return {}; } },
  };
  // resume after a reload: if the phase ran out while the page was closed, wait at the start of the next one
  if (s.active && s.running && Date.now() >= s.endsAt) { s.running = false; s.left = full(); }
  return api;
}

/* ---------- chime (Web Audio, no files) ---------- */
let ctx = null;
export function primeAudio() {
  try { ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === 'suspended') ctx.resume(); } catch { ctx = null; }
}
export function chime(kind = 'break') {
  if (!ctx) return;
  const notes = kind === 'break' ? [659, 880, 1175] : [880, 659, 523]; // rising: time to rest; falling: back to work
  notes.forEach((f, i) => {
    const t = ctx.currentTime + i * 0.22;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    o.connect(g); g.connect(ctx.destination);
    o.start(t); o.stop(t + 1);
  });
}

/* ---------- rendering ---------- */
const R = 88, C = 2 * Math.PI * R;
export const mmss = (ms) => { const t = Math.ceil(ms / 1000); return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; };
const clock12 = (d) => `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() >= 12 ? 'PM' : 'AM'}`;
const LABEL = { focus: 'Focus', short: 'Short break', long: 'Long break' };

function stepper(kind, label, val) {
  return `<div class="stp"><span>${label}</span><button type="button" data-step="${kind}:-1" aria-label="Shorter ${label}">−</button><b>${val}<small>m</small></b><button type="button" data-step="${kind}:1" aria-label="Longer ${label}">+</button></div>`;
}

export function renderPomo(p) {
  const s = p.s, left = p.left(), rest = s.phase !== 'focus';
  const frac = 1 - left / p.full();
  const beads = Array.from({ length: s.len.cycles }, (_, i) => {
    const done = i + 1 < s.idx || (i + 1 === s.idx && rest);
    const cur = i + 1 === s.idx && !rest;
    return `<i class="${done ? 'd' : cur ? 'c' : ''}"></i>`;
  }).join('');
  const ends = s.running ? `Ends at ${clock12(new Date(s.endsAt))}` : left === p.full() && !s.running ? 'Ready when you are' : 'Paused';
  const presets = PRESETS.map((x) => {
    const on = x.focus === s.len.focus && x.short === s.len.short && x.long === s.len.long && x.cycles === s.len.cycles;
    return `<button type="button" class="pst${on ? ' on' : ''}" data-preset="${x.id}">${x.name}<small>${x.focus}/${x.short}/${x.long}</small></button>`;
  }).join('');
  const startLabel = s.running ? 'Pause' : left === p.full() ? 'Start' : 'Resume';
  return `<div class="row" style="gap:10px"><h2 class="h2 hi">${icon('tomato', 34, 'tom')}Focus</h2><span class="phase ${rest ? 'rest' : ''}">${LABEL[s.phase]}</span><span class="grow"></span><div class="beads" role="img" aria-label="Round ${s.idx} of ${s.len.cycles}">${beads}</div></div>
    <div class="pbody"><div class="pring"><svg width="210" height="210" viewBox="0 0 230 230" fill="none" role="img" aria-label="${mmss(left)} left">
      <circle cx="115" cy="115" r="${R}" stroke-width="20" style="stroke:var(--track)"/>
      <circle id="pm-ring" cx="115" cy="115" r="${R}" stroke-width="20" stroke-linecap="round" stroke-dasharray="${(frac * C).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 115 115)" style="stroke:${rest ? 'var(--mint-d)' : 'var(--orange)'};opacity:${frac < 0.004 ? 0 : 1}"/></svg>
      <div><b id="pm-time">${mmss(left)}</b><span id="pm-end">${ends}</span></div></div>
    <div class="pctl"><button type="button" class="btn primary" data-act="toggle">${startLabel}</button><button type="button" class="btn" data-act="skip">${rest ? 'Skip break' : 'Skip'}</button><button type="button" class="btn hold" data-act="end"><i></i><span>Hold to end</span></button></div></div>
    <div class="stps">${stepper('focus', 'Focus', s.len.focus)}${stepper('short', 'Short', s.len.short)}${stepper('long', 'Long', s.len.long)}</div>
    <div class="psts">${presets}</div>`;
}

/* Cheap per-second update that does not rebuild the card (so a long press is not interrupted). */
export function updatePomoLive(p) {
  const s = p.s, left = p.left();
  const t = document.getElementById('pm-time'); if (!t) return;
  t.textContent = mmss(left);
  const ring = document.getElementById('pm-ring');
  if (ring) { const f = 1 - left / p.full(); ring.setAttribute('stroke-dasharray', `${(f * C).toFixed(1)} ${C.toFixed(1)}`); ring.style.opacity = f < 0.004 ? 0 : 1; }
  const e = document.getElementById('pm-end');
  if (e && s.running) e.textContent = `Ends at ${clock12(new Date(s.endsAt))}`;
}
