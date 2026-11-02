// Card renderers. Each returns an HTML string; every piece of external text goes through esc().
import { dayDiff, researchSummary, QUIET_DAYS, dateKey } from './model.js';
import { icon } from './icons.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const SAMPLE = '<span class="sample-tag">sample</span>';
const CHECK = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="stroke:var(--on-orange)"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const EVENT_COLORS = ['var(--orange)', 'var(--butter)', 'var(--lav)', 'var(--mint)'];

const clock12 = (d) => ({ hm: `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')}`, ap: d.getHours() >= 12 ? 'PM' : 'AM' });
function until(ms) {
  const m = Math.round(ms / 60000);
  if (m < 60) return `in ${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `in ${h} h ${r} m` : `in ${h} h`;
}

// small ring that drains as the next event gets closer (full at 3 hours out)
function nextRing(ms) {
  const f = Math.min(Math.max(ms / (3 * 3600000), 0), 1), c = 2 * Math.PI * 7;
  return `<svg class="nring" width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><circle cx="9" cy="9" r="7" stroke-width="3" style="stroke:rgba(29,27,22,0.22)"/><circle cx="9" cy="9" r="7" stroke-width="3" stroke-linecap="round" stroke-dasharray="${(f * c).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 9 9)" style="stroke:var(--on-orange)"/></svg>`;
}

/* ---------- Today ---------- */
export function renderToday(model, now = new Date(), sunText = '') {
  const evs = model.events;
  const nextIdx = evs.findIndex((e) => !e.allDay && e.start > now);
  const strip = [];
  for (let h = 7; h <= 18; h++) {
    const idx = evs.findIndex((e) => !e.allDay && e.start.getHours() <= h && (e.end || e.start).getTime() > new Date(now.getFullYear(), now.getMonth(), now.getDate(), h).getTime() && e.start.getTime() < new Date(now.getFullYear(), now.getMonth(), now.getDate(), h + 1).getTime());
    const isNow = now.getHours() === h;
    const label = h % 12 || 12;
    strip.push(`<div class="dcell${idx >= 0 ? ' ev' : ''}${isNow ? ' now' : ''}${h < now.getHours() ? ' past' : ''}" ${idx >= 0 ? `style="--c:${EVENT_COLORS[idx % 4]}"` : ''}>${isNow && idx < 0 ? '<i></i>' : label}</div>`);
  }
  const upcoming = evs.some((e) => e.allDay || (e.end || e.start) > now);
  const rows = evs.length && upcoming ? evs.map((e, i) => {
    const t = clock12(e.start);
    const past = !e.allDay && (e.end || e.start) <= now;
    const isNext = i === nextIdx;
    let when = '';
    if (past) when = '<span class="cnt" style="display:flex;align-items:center;gap:5px"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>Done</span>';
    else if (isNext && e.start - now < 3 * 3600000) when = `<span class="when soon">${nextRing(e.start - now)}${until(e.start - now)}</span>`;
    else if (!e.allDay) when = `<span class="when">${until(e.start - now)}</span>`;
    const time = e.allDay ? '<b>All</b><span>day</span>' : `<b>${t.hm}</b><span>${t.ap}</span>`;
    return `<div class="ev${past ? ' past' : ''}${isNext ? ' next' : ''}" style="--c:${EVENT_COLORS[i % 4]}"><div class="tm">${time}</div><div class="bar"></div><div class="nm"><b>${esc(e.title)}</b><span>${esc(e.sub)}</span></div>${when}</div>`;
  }).join('') : '';
  const rest = upcoming ? '' : `<div class="calm">${icon('today', 76)}<b>${evs.length ? 'All done for today' : 'Clear day'}</b><span>${evs.length ? `${evs.length} event${evs.length === 1 ? '' : 's'} finished. Nothing else scheduled.` : 'Nothing on the calendar today.'}</span>${sunText ? `<em>${esc(sunText)}</em>` : ''}</div>`;
  return `<div class="row" style="justify-content:space-between"><h2 class="h2 hi">${icon('today')}Today</h2><div class="row" style="gap:8px">${model.source === 'sample' ? SAMPLE : ''}<span class="cnt">${evs.length} event${evs.length === 1 ? '' : 's'}</span></div></div>
    <div class="daystrip" aria-hidden="true">${strip.join('')}</div>
    <div class="evlist">${rows}${rest}</div>`;
}

/* ---------- Tasks ---------- */
// the same tag always gets the same one of four hues
const hue = (tag) => [...String(tag || '')].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 4, 0);
export function renderTasks(model) {
  const shown = model.tasks.slice(0, 6);
  const done = model.tasks.filter((t) => t.done).length;
  const total = model.tasks.length;
  const head = model.source === 'sample'
    ? `<div class="row" style="gap:10px">${SAMPLE}<div class="prog"><i style="width:${total ? Math.round((done / total) * 100) : 0}%"></i></div><span class="cnt" style="background:none;padding:0">${done} of ${total}</span></div>`
    : `<span class="cnt">${total} open</span>`;
  const rows = shown.length ? shown.map((t) =>
    `<div class="tk${t.done ? ' done' : ''} h${hue(t.tag)}"><div class="bx${t.done ? ' ok' : ''}">${t.done ? CHECK : ''}</div><div class="tt">${esc(t.title)}</div>${t.tag ? `<span class="tg-chip h${hue(t.tag)}">${esc(t.tag)}</span>` : ''}</div>`
  ).join('') : '<div class="empty">No open tasks. Nice.</div>';
  return `<div class="row" style="justify-content:space-between"><h2 class="h2 hi">${icon('tasks')}Tasks</h2>${head}</div><div>${rows}</div>`;
}

/* ---------- Tiles ---------- */
export function streakOf(touched, now = new Date()) {
  const set = new Set(touched || []);
  const key = (n) => dateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - n));
  let n = set.has(key(0)) ? 0 : 1, c = 0;
  while (set.has(key(n))) { c++; n++; }
  return c;
}

// Two-strand helix over the last 14 days. Filled beads = days you touched the draft.
function helix(touched, now) {
  const set = new Set(touched || []);
  const beads = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (13 - i));
    const on = set.has(dateKey(d)), x = 7 + i * 13.5, ph = i * 0.62;
    const ya = 20 + Math.sin(ph) * 9, yb = 20 - Math.sin(ph) * 9;
    const today = i === 13;
    beads.push(`<line x1="${x}" y1="${ya.toFixed(1)}" x2="${x}" y2="${yb.toFixed(1)}" stroke-width="2" style="stroke:var(--on-orange);opacity:${on ? 0.5 : 0.15}"/>`
      + `<circle class="rg${today ? ' today' : ''}" cx="${x}" cy="${ya.toFixed(1)}" r="${on ? 4 : 3}" style="fill:${on ? 'var(--on-orange)' : 'none'};stroke:var(--on-orange);stroke-width:1.8;opacity:${on ? 1 : 0.4}"/>`
      + `<circle cx="${x}" cy="${yb.toFixed(1)}" r="${on ? 3 : 2.4}" style="fill:${on ? 'var(--orange)' : 'none'};stroke:var(--on-orange);stroke-width:1.5;opacity:${on ? 1 : 0.35}"/>`);
  }
  return `<svg class="helix" width="190" height="40" viewBox="0 0 190 40" role="img" aria-label="Writing days over the last two weeks">${beads.join('')}</svg>`;
}

export function renderWriting(model, now = new Date()) {
  const w = model.writing;
  if (!w) return `<div class="grow"><div class="lab">${icon('writing', 26, 'tile')}Writing</div><div class="ttl">No writing project yet</div></div>`;
  const since = w.lastTouched ? dayDiff(now, w.lastTouched) : null;
  const streak = streakOf(w.touched, now);
  const words = `+${Math.round(w.wordsWeek).toLocaleString('en-US')}`;
  const second = streak > 1 ? `${streak}-day streak` : since != null ? (since === 0 ? 'touched today' : `${since} d since touch`) : '';
  return `<div class="grow"><div class="lab">${icon('writing', 26, 'tile')}Writing${model.source === 'sample' ? SAMPLE : ''}</div>
    <div class="ttl">${esc(w.project)}</div>${helix(w.touched, now)}</div>
    <div class="big glance"><div class="ga"><b>${words}</b><span>words this week</span></div>${second ? `<div class="gb"><b>${streak > 1 ? streak : '·'}</b><span>${esc(second)}</span></div>` : ''}</div>`;
}

export const FOCUS_GOAL_MIN = 200; // 8 Pomodoros of 25 minutes
export function renderFocus(model, now = new Date()) {
  const f = model.focus;
  const h = Math.floor(f.todayMin / 60), m = f.todayMin % 60;
  const c = 2 * Math.PI * 7.5;
  const rings = f.week.map((v, i) => {
    const frac = Math.min(v / FOCUS_GOAL_MIN, 1);
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - i));
    return `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-label="${day.toLocaleDateString('en-US', { weekday: 'short' })}: ${v} minutes"><circle cx="11" cy="11" r="7.5" stroke-width="3.4" style="stroke:var(--on-orange);opacity:0.2"/><circle cx="11" cy="11" r="7.5" stroke-width="3.4" stroke-linecap="round" stroke-dasharray="${(frac * c).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 11 11)" style="stroke:var(--on-orange);opacity:${i === 6 ? 1 : 0.7}"/></svg>`;
  }).join('');
  return `<div class="hd"><span class="h2 hi" style="font-size:14px;gap:8px">${icon('focus', 24, 'tile')}Focus today${model.source === 'sample' ? ' ' + SAMPLE : ''}</span><span style="font-weight:700">7 days</span></div>
    <div class="num">${h ? `${h}h ` : ''}${m}m</div><div class="wring" role="img" aria-label="Focus minutes over the last seven days">${rings}</div>`;
}

/* ---------- Research supervision ---------- */
const ROLE = { adviser: ['var(--lav-d)', 'var(--lav-soft)'], lead: ['var(--orange)', 'var(--orange-soft)'], 'co-lead': ['var(--mint-d)', 'var(--mint-soft)'] };
export function renderResearch(model, now = new Date(), maxRows = 4) {
  const list = [...model.research].sort((a, b) => (a.milestoneDate ? +a.milestoneDate : Infinity) - (b.milestoneDate ? +b.milestoneDate : Infinity));
  const sum = researchSummary(list, now);
  const rows = list.slice(0, maxRows).map((p) => {
    const [c, cs] = ROLE[p.role.toLowerCase()] || ['var(--muted)', 'var(--soft)'];
    const quiet = p.lastUpdate && dayDiff(now, p.lastUpdate) > QUIET_DAYS;
    const dd = p.milestoneDate ? dayDiff(p.milestoneDate, now) : null;
    let chip = '';
    if (quiet) chip = `<span class="rm quiet">Quiet · ${dayDiff(now, p.lastUpdate)} d<span class="zz qz">z</span></span>`;
    else if (p.milestone || dd != null) {
      const when = dd == null ? '' : dd < 0 ? `${-dd} d overdue` : dd === 0 ? 'today' : `${dd} d`;
      chip = `<span class="rm${dd != null && dd <= 3 ? ' urgent' : ''}">${esc(p.milestone)}${p.milestone && when ? ' · ' : ''}${when}</span>`;
    }
    const n = Math.min(p.steps.length, 10);
    const segs = Array.from({ length: n }, (_, i) => `<i class="sg${i + 1 < p.current ? ' d' : i + 1 === p.current ? ' n' : ''}"></i>`).join('');
    const stepName = p.steps[p.current - 1] || '';
    return `<div class="rr" style="--c:${c};--cs:${cs}"><div class="rt"><span class="rl">${esc(p.role || '·')}</span><span class="rn">${esc(p.title)}</span>${chip}</div>
      <div class="rs"><div class="sgs">${segs}</div><span class="st">${esc(stepName)}${n ? ` · ${p.current}/${n}` : ''}</span></div></div>`;
  }).join('') || '<div class="empty">Add rows to the Research tab to see your projects here.</div>';
  return `<div class="row"><h2 class="h2 hi">${icon('research', 30)}Research supervision</h2><span style="flex:1"></span>${model.source === 'sample' ? SAMPLE + '&nbsp;' : ''}<span class="cnt">${model.researchTotal} project${model.researchTotal === 1 ? '' : 's'}</span></div>
    <div class="chips"><span class="tag" style="background:var(--orange-soft)">${sum.dueMonth} due this month</span><span class="tag" style="background:var(--butter-soft)">${sum.quiet} gone quiet</span><span class="tag" style="background:var(--lav-soft)">${sum.ethics} in ethics</span></div>
    <div class="rlist">${rows}</div>`;
}

/* ---------- Camera and printer (sample visuals until the local agent exists) ---------- */
export const CAM_FRESH_MIN = 6; // a picture older than this counts as resting

export function camAge(at, now = new Date()) {
  if (!at) return '';
  const m = Math.max(0, Math.round((now - at) / 60000));
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  return `${h} h ${m % 60} min ago`;
}

// cam: { mode: 'sample' | 'live' | 'resting', online (sample only), image, at }
export function renderCamera(cam, now = new Date()) {
  const sample = cam.mode === 'sample';
  const live = cam.mode === 'live';
  const online = sample ? cam.online : live;
  const t = `${now.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })} · ${clock12(now).hm}:${String(now.getSeconds()).padStart(2, '0')} ${clock12(now).ap}`;
  let scene;
  if (live) {
    const taken = cam.at ? `${cam.at.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })} · ${clock12(cam.at).hm} ${clock12(cam.at).ap}` : '';
    scene = `<img src="data:image/jpeg;base64,${esc(cam.image)}" alt="Latest snapshot from the downstairs camera" class="${cam.fade ? 'fadein' : ''}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">
      <div class="glass" style="left:14px;top:14px">Cam 1 · Downstairs</div>
      <div class="glass" style="left:14px;bottom:14px">${esc(taken)}</div>`;
  } else if (sample && online) {
    scene = `
      <div style="left:0;right:0;bottom:0;height:34%;background:linear-gradient(180deg,var(--cam-floor-a),var(--cam-floor-b))"></div>
      <div style="left:8%;top:9%;width:23%;height:42%;box-sizing:border-box;border-radius:16px;border:8px solid var(--card);background:var(--cam-window)"></div>
      <div style="left:36%;bottom:6%;width:30%;height:14%;border-radius:50%;background:var(--cam-rug)"></div>
      <div style="right:6%;bottom:23%;width:34%;height:25%;border-radius:30px 30px 14px 14px;background:var(--cam-sofa)"></div>
      <div style="right:8%;bottom:17%;width:30%;height:12%;border-radius:18px;background:var(--cam-sofa);filter:brightness(0.92)"></div>
      <div style="right:11%;bottom:31%;width:8%;height:12%;border-radius:40%;background:var(--orange)"></div>
      <div style="left:43%;bottom:30%;width:7%;height:11%;border-radius:50%;background:var(--cam-plant)"></div>
      <div class="glass" style="left:50%;top:50%;transform:translate(-50%,-50%);font-size:15px;white-space:nowrap">Your Tapo snapshot appears here</div>
      <div class="glass" style="left:14px;top:14px">Cam 1 · Downstairs</div>
      <div class="glass" style="left:14px;bottom:14px">${esc(t)}</div>`;
  } else {
    const sub = sample ? 'The Tapo link runs through the laptop'
      : cam.at ? `Last picture ${camAge(cam.at, now)}` : 'No picture yet. Start the camera script on the laptop';
    scene = `<div class="sleep" style="position:absolute">
        <div style="position:relative;width:130px;height:130px"><div style="position:absolute;inset:0;border-radius:50%;background:var(--ink-tile);overflow:hidden">
          <div style="position:absolute;left:21px;top:21px;width:88px;height:88px;border-radius:50%;background:var(--lav)"></div>
          <div style="position:absolute;left:44px;top:44px;width:42px;height:42px;border-radius:50%;background:var(--ink-tile)"></div>
          <div class="lid" style="position:absolute;left:0;top:0;width:130px;height:50%;background:var(--ink-tile);border-radius:0 0 65px 65px/0 0 30px 30px"></div></div>
          <span class="zz" style="position:absolute;left:112px;top:20px;font-size:24px;color:var(--lav-d)">z</span><span class="zz" style="position:absolute;left:112px;top:20px;font-size:24px;color:var(--lav-d);animation-delay:-1.1s">z</span><span class="zz" style="position:absolute;left:112px;top:20px;font-size:24px;color:var(--lav-d);animation-delay:-2.2s">z</span></div>
        <div style="display:flex;flex-direction:column;align-items:center;gap:4px"><b style="font-size:24px;font-weight:800;letter-spacing:-0.02em">Camera is resting</b><span class="muted" style="font-size:15px">${esc(sub)}</span></div></div>`;
  }
  const status = sample ? (online ? 'Snapshot · updated 6 s ago' : 'Paused · laptop asleep')
    : live ? `Snapshot · updated <span id="cam-age">${esc(camAge(cam.at, now))}</span>`
    : 'Resting · laptop asleep or script stopped';
  let foot = '';
  if (sample) {
    const bars = Array.from({ length: 24 }, (_, i) => `<i class="${[7, 8, 9].includes(i) ? 'm' : ''}" style="${i === 7 ? 'height:36px' : i === 8 ? 'height:26px' : i === 6 ? 'height:20px' : i === 9 ? 'height:14px' : ''}"></i>`).join('');
    foot = `<div class="motion"><div style="display:flex;flex-direction:column;gap:1px"><b style="font-size:15px;font-weight:800">Motion today</b><span class="muted small">3 events · last at 8:12 AM</span></div><div class="bars" role="img" aria-label="Motion activity by hour">${bars}</div></div>`;
  }
  return `<div class="cam-hd"><h2 class="h2 hi">${icon('cam')}Downstairs</h2>${sample ? SAMPLE : ''}<span class="cam-stat"><i class="${online ? 'live-dot' : ''}" style="background:${online ? 'var(--orange)' : 'var(--muted)'}"></i>${status}</span></div>
    <div class="cam-view">${scene}</div>${foot}`;
}

export function renderPrinter(online) {
  const head = `<div class="row" style="gap:12px"><h2 class="h2 hi">${icon('printer')}Bambu Lab A1 Mini</h2>${SAMPLE}
      ${online ? '<div class="prn-pill"><i class="live-dot"></i>Printing</div>' : '<div class="cnt">Paused</div>'}
      <span style="flex:1"></span><div class="fil"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2.6"/></svg>Filament<div class="trk"><i></i></div>68%</div>
      <span class="muted" style="font-size:14px">bracket_v3_x4.3mf</span></div>`;
  if (online) {
    return `${head}<div class="prn-body"><div class="ring"><svg width="150" height="150" viewBox="0 0 150 150" fill="none" role="img" aria-label="Print 64 percent complete"><circle cx="75" cy="75" r="60" stroke-width="16" style="stroke:var(--track)"/><circle cx="75" cy="75" r="60" stroke-width="16" stroke-linecap="round" stroke-dasharray="241.3 377" transform="rotate(-90 75 75)" style="stroke:var(--orange)"/></svg><div><b>64%</b><span>complete</span></div></div>
      <div class="stats"><div class="sm"><span>Time left</span><b>1h 12m</b></div><div class="sm"><span>Layer</span><b>142<small>/218</small></b></div><div class="sm"><span>Done at</span><b>10:53</b></div><div class="sm"><span>Nozzle</span><b>220°</b></div><div class="sm"><span>Bed</span><b>60°</b></div><div class="sm"><span>Part fan</span><b>70%</b></div></div></div>`;
  }
  return `${head}<div class="prn-body" style="gap:26px;height:150px">
    <div style="position:relative;width:150px;height:150px;flex:none;border-radius:26px;background:var(--lav-soft);overflow:hidden">
      <div class="nz" style="position:absolute;left:67px;top:28px;width:16px;height:22px;border-radius:5px 5px 8px 8px;background:var(--ink)"></div>
      <div class="ly" style="position:absolute;left:30px;top:104px;width:90px;height:12px;border-radius:6px;background:var(--orange)"></div>
      <div class="ly" style="position:absolute;left:30px;top:90px;width:90px;height:12px;border-radius:6px;background:var(--lav-d);animation-delay:-1.1s"></div>
      <div class="ly" style="position:absolute;left:30px;top:76px;width:90px;height:12px;border-radius:6px;background:var(--orange);animation-delay:-2.2s"></div>
      <div class="ly" style="position:absolute;left:30px;top:62px;width:90px;height:12px;border-radius:6px;background:var(--lav-d);animation-delay:-3.3s"></div>
      <div style="position:absolute;left:20px;right:20px;top:120px;height:8px;border-radius:4px;background:var(--ink);opacity:0.18"></div></div>
    <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:8px"><b style="font-size:24px;font-weight:800;letter-spacing:-0.02em">Live print data is paused</b><span class="muted" style="font-size:16px;line-height:1.4">Nozzle, bed and layer stats arrive through the laptop. Last seen: bracket_v3_x4.3mf finished at 11:48 PM.</span></div>
    <div style="display:flex;flex-direction:column;gap:10px;flex:none"><div class="sm" style="width:150px"><span>Last job</span><b>3h 12m</b></div><div class="sm" style="width:150px"><span>Prints today</span><b>2</b></div></div></div>`;
}
