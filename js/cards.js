// Card renderers. Each returns an HTML string; every piece of external text goes through esc().
import { dayDiff, researchSummary, QUIET_DAYS } from './model.js';

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

/* ---------- Today ---------- */
export function renderToday(model, now = new Date()) {
  const evs = model.events;
  const nextIdx = evs.findIndex((e) => !e.allDay && e.start > now);
  const strip = [];
  for (let h = 7; h <= 18; h++) {
    const idx = evs.findIndex((e) => !e.allDay && e.start.getHours() <= h && (e.end || e.start).getTime() > new Date(now.getFullYear(), now.getMonth(), now.getDate(), h).getTime() && e.start.getTime() < new Date(now.getFullYear(), now.getMonth(), now.getDate(), h + 1).getTime());
    const isNow = now.getHours() === h;
    const label = h % 12 || 12;
    strip.push(`<div class="dcell${idx >= 0 ? ' ev' : ''}${isNow ? ' now' : ''}" ${idx >= 0 ? `style="--c:${EVENT_COLORS[idx % 4]}"` : ''}>${isNow && idx < 0 ? '<i></i>' : label}</div>`);
  }
  const rows = evs.length ? evs.map((e, i) => {
    const t = clock12(e.start);
    const past = !e.allDay && (e.end || e.start) <= now;
    const isNext = i === nextIdx;
    let when = '';
    if (past) when = '<span class="cnt" style="display:flex;align-items:center;gap:5px"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>Done</span>';
    else if (isNext && e.start - now < 3 * 3600000) when = `<span class="when soon">${until(e.start - now)}</span>`;
    else if (!e.allDay) when = `<span class="when">${until(e.start - now)}</span>`;
    const time = e.allDay ? '<b>All</b><span>day</span>' : `<b>${t.hm}</b><span>${t.ap}</span>`;
    return `<div class="ev${past ? ' past' : ''}${isNext ? ' next' : ''}" style="--c:${EVENT_COLORS[i % 4]}"><div class="tm">${time}</div><div class="bar"></div><div class="nm"><b>${esc(e.title)}</b><span>${esc(e.sub)}</span></div>${when}</div>`;
  }).join('') : '<div class="empty">Nothing on the calendar today.</div>';
  return `<div class="row" style="justify-content:space-between"><h2 class="h2">Today</h2><div class="row" style="gap:8px">${model.source === 'sample' ? SAMPLE : ''}<span class="cnt">${evs.length} event${evs.length === 1 ? '' : 's'}</span></div></div>
    <div class="daystrip" aria-hidden="true">${strip.join('')}</div>
    <div class="evlist">${rows}</div>`;
}

/* ---------- Tasks ---------- */
export function renderTasks(model) {
  const shown = model.tasks.slice(0, 6);
  const done = model.tasks.filter((t) => t.done).length;
  const total = model.tasks.length;
  const head = model.source === 'sample'
    ? `<div class="row" style="gap:10px">${SAMPLE}<div class="prog"><i style="width:${total ? Math.round((done / total) * 100) : 0}%"></i></div><span class="cnt" style="background:none;padding:0">${done} of ${total}</span></div>`
    : `<span class="cnt">${total} open</span>`;
  const rows = shown.length ? shown.map((t) =>
    `<div class="tk${t.done ? ' done' : ''}"><div class="bx${t.done ? ' ok' : ''}">${t.done ? CHECK : ''}</div><div class="tt">${esc(t.title)}</div>${t.tag ? `<span class="tg-chip">${esc(t.tag)}</span>` : ''}</div>`
  ).join('') : '<div class="empty">No open tasks. Nice.</div>';
  return `<div class="row" style="justify-content:space-between"><h2 class="h2">Tasks</h2>${head}</div><div>${rows}</div>`;
}

/* ---------- Tiles ---------- */
export function renderWriting(model, now = new Date()) {
  const w = model.writing;
  if (!w) return `<div class="grow"><div class="lab">Writing</div><div class="ttl">No writing project yet</div></div>`;
  const since = w.lastTouched ? dayDiff(now, w.lastTouched) : null;
  const segs = Array.from({ length: Math.min(w.sectionsTotal, 8) }, (_, i) => {
    const d = w.sectionsDone - i;
    return `<i class="${d >= 1 ? 'f' : d >= 0.5 ? 'h' : ''}"></i>`;
  }).join('');
  return `<div class="grow"><div class="lab">Writing${since != null ? `<span>${since === 0 ? 'touched today' : `${since} d since last touch`}</span>` : ''}${model.source === 'sample' ? SAMPLE : ''}</div>
    <div class="ttl">${esc(w.project)}</div><div class="segs" aria-hidden="true">${segs}</div></div>
    <div class="big"><b>+${Math.round(w.wordsWeek).toLocaleString('en-US')}</b><span>words this week</span></div>`;
}

export function renderFocus(model) {
  const f = model.focus;
  const h = Math.floor(f.todayMin / 60), m = f.todayMin % 60;
  const max = Math.max(1, ...f.week);
  const bars = f.week.map((v) => `<i style="height:${Math.max(4, Math.round((v / max) * 20))}px"></i>`).join('');
  return `<div class="hd"><span>Focus today${model.source === 'sample' ? ' ' + SAMPLE : ''}</span><span style="font-weight:700">7 days</span></div>
    <div class="num">${h ? `${h}h ` : ''}${m}m</div><div class="wk" role="img" aria-label="Focus minutes over the last seven days">${bars}</div>`;
}

export function renderDevice(tab, battery, laptopOnline) {
  const tabs = `<div class="devtabs"><button type="button" data-tab="laptop" class="${tab === 'laptop' ? 'on' : ''}">Laptop</button><button type="button" data-tab="tablet" class="${tab === 'tablet' ? 'on' : ''}">Tablet</button></div>`;
  if (tab === 'laptop') {
    if (!laptopOnline) {
      return `${tabs}<div class="dev-body" style="flex-direction:row;align-items:center;gap:10px"><div><div class="bat" style="font-size:22px;line-height:1.1">Laptop is asleep</div><div class="bat-sub">Stats return when it wakes</div></div>
        <div style="position:relative;width:54px;height:48px;flex:none"><svg width="54" height="42" viewBox="0 0 54 42" fill="none" aria-hidden="true"><rect x="9" y="4" width="36" height="24" rx="4" stroke="currentColor" stroke-width="2.4"/><path d="M3 34h48" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M20 15q7 5 14 0" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg><span class="zz" style="position:absolute;left:38px;top:2px;font-size:15px;color:var(--mint)">z</span><span class="zz" style="position:absolute;left:38px;top:2px;font-size:15px;color:var(--mint);animation-delay:-1.7s">z</span></div></div>`;
    }
    return `${tabs}<div class="dev-body"><div class="meter"><span>CPU</span><div class="trk"><i style="width:23%;background:var(--orange)"></i></div><b>23%</b></div>
      <div class="meter"><span>RAM</span><div class="trk"><i style="width:59%;background:var(--mint)"></i></div><b>59%</b></div></div>`;
  }
  const lvl = battery ? Math.round(battery.level * 100) : null;
  return `${tabs}<div class="dev-body" style="gap:2px"><div class="bat">${lvl == null ? '–' : lvl + '%'}</div><div class="bat-sub">Tablet${battery ? (battery.charging ? ' · charging' : ' · on battery') : ' · battery not available'}</div></div>`;
}

/* ---------- Research supervision ---------- */
const ROLE = { adviser: ['var(--lav-d)', 'var(--lav-soft)'], lead: ['var(--orange)', 'var(--orange-soft)'], 'co-lead': ['var(--mint-d)', 'var(--mint-soft)'] };
export function renderResearch(model, now = new Date()) {
  const list = [...model.research].sort((a, b) => (a.milestoneDate ? +a.milestoneDate : Infinity) - (b.milestoneDate ? +b.milestoneDate : Infinity));
  const sum = researchSummary(list, now);
  const rows = list.slice(0, 5).map((p) => {
    const [c, cs] = ROLE[p.role.toLowerCase()] || ['var(--muted)', 'var(--soft)'];
    const quiet = p.lastUpdate && dayDiff(now, p.lastUpdate) > QUIET_DAYS;
    const dd = p.milestoneDate ? dayDiff(p.milestoneDate, now) : null;
    let chip = '';
    if (quiet) chip = `<span class="rm quiet">Quiet · ${dayDiff(now, p.lastUpdate)} d</span>`;
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
  return `<div class="row"><h2 class="h2">Research supervision</h2><span style="flex:1"></span>${model.source === 'sample' ? SAMPLE + '&nbsp;' : ''}<span class="cnt">${model.researchTotal} project${model.researchTotal === 1 ? '' : 's'}</span></div>
    <div class="chips"><span class="tag" style="background:var(--orange-soft)">${sum.dueMonth} due this month</span><span class="tag" style="background:var(--butter-soft)">${sum.quiet} gone quiet</span><span class="tag" style="background:var(--lav-soft)">${sum.ethics} in ethics</span></div>
    <div class="rlist">${rows}</div>`;
}

/* ---------- Camera and printer (sample visuals until the local agent exists) ---------- */
export function renderCamera(online, now = new Date()) {
  const t = `${now.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })} · ${clock12(now).hm}:${String(now.getSeconds()).padStart(2, '0')} ${clock12(now).ap}`;
  const scene = online ? `
      <div style="left:0;right:0;bottom:0;height:34%;background:linear-gradient(180deg,var(--cam-floor-a),var(--cam-floor-b))"></div>
      <div style="left:8%;top:9%;width:23%;height:42%;box-sizing:border-box;border-radius:16px;border:8px solid var(--card);background:var(--cam-window)"></div>
      <div style="left:36%;bottom:6%;width:30%;height:14%;border-radius:50%;background:var(--cam-rug)"></div>
      <div style="right:6%;bottom:23%;width:34%;height:25%;border-radius:30px 30px 14px 14px;background:var(--cam-sofa)"></div>
      <div style="right:8%;bottom:17%;width:30%;height:12%;border-radius:18px;background:var(--cam-sofa);filter:brightness(0.92)"></div>
      <div style="right:11%;bottom:31%;width:8%;height:12%;border-radius:40%;background:var(--orange)"></div>
      <div style="left:43%;bottom:30%;width:7%;height:11%;border-radius:50%;background:var(--cam-plant)"></div>
      <div class="glass" style="left:50%;top:50%;transform:translate(-50%,-50%);font-size:15px;white-space:nowrap">Your Tapo snapshot appears here</div>
      <div class="glass" style="left:14px;top:14px">Cam 1 · Downstairs</div>
      <div class="glass" style="left:14px;bottom:14px">${esc(t)}</div>`
    : `<div class="sleep" style="position:absolute">
        <div style="position:relative;width:130px;height:130px"><div style="position:absolute;inset:0;border-radius:50%;background:var(--ink-tile);overflow:hidden">
          <div style="position:absolute;left:21px;top:21px;width:88px;height:88px;border-radius:50%;background:var(--lav)"></div>
          <div style="position:absolute;left:44px;top:44px;width:42px;height:42px;border-radius:50%;background:var(--ink-tile)"></div>
          <div class="lid" style="position:absolute;left:0;top:0;width:130px;height:50%;background:var(--ink-tile);border-radius:0 0 65px 65px/0 0 30px 30px"></div></div>
          <span class="zz" style="position:absolute;left:112px;top:20px;font-size:24px;color:var(--lav-d)">z</span><span class="zz" style="position:absolute;left:112px;top:20px;font-size:24px;color:var(--lav-d);animation-delay:-1.1s">z</span><span class="zz" style="position:absolute;left:112px;top:20px;font-size:24px;color:var(--lav-d);animation-delay:-2.2s">z</span></div>
        <div style="display:flex;flex-direction:column;align-items:center;gap:4px"><b style="font-size:24px;font-weight:800;letter-spacing:-0.02em">Camera is resting</b><span class="muted" style="font-size:15px">The Tapo link runs through the laptop</span></div></div>`;
  const bars = Array.from({ length: 24 }, (_, i) => `<i class="${[7, 8, 9].includes(i) ? 'm' : ''}" style="${i === 7 ? 'height:36px' : i === 8 ? 'height:26px' : i === 6 ? 'height:20px' : i === 9 ? 'height:14px' : ''}"></i>`).join('');
  return `<div class="cam-hd"><h2 class="h2">Downstairs</h2>${SAMPLE}<span class="cam-stat"><i class="${online ? 'live-dot' : ''}" style="background:${online ? 'var(--orange)' : 'var(--muted)'}"></i>${online ? 'Snapshot · updated 6 s ago' : 'Paused · laptop asleep'}</span></div>
    <div class="cam-view">${scene}</div>
    <div class="motion"><div style="display:flex;flex-direction:column;gap:1px"><b style="font-size:15px;font-weight:800">Motion today</b><span class="muted small">3 events · last at 8:12 AM</span></div><div class="bars" role="img" aria-label="Motion activity by hour">${bars}</div></div>`;
}

export function renderPrinter(online) {
  const head = `<div class="row" style="gap:12px"><h2 class="h2">Bambu Lab A1 Mini</h2>${SAMPLE}
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
