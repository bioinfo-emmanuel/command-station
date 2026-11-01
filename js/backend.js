// Reads the dashboard's private data (calendar, tasks, Sheet tabs) from the user's own Google Apps Script web app.
// Contract: GET <backend>?token=... returns JSON, see apps-script/README.md.
const CACHE = 'cs.backend.v1';

export async function loadBackend(cfg) {
  if (!cfg.backend) return { ok: false, reason: 'not-configured' };
  try {
    const u = new URL(cfg.backend);
    if (cfg.token) u.searchParams.set('token', cfg.token);
    const res = await fetch(u.toString(), { redirect: 'follow', cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data && data.error) throw new Error(data.error);
    try { localStorage.setItem(CACHE, JSON.stringify({ at: Date.now(), data })); } catch { /* storage unavailable */ }
    return { ok: true, data, source: 'live' };
  } catch (err) {
    try {
      const c = JSON.parse(localStorage.getItem(CACHE) || 'null');
      if (c) return { ok: true, data: c.data, source: 'cache', error: String(err.message || err) };
    } catch { /* ignore */ }
    return { ok: false, reason: String(err.message || err) };
  }
}

export function summarize(data) {
  const n = (x) => (Array.isArray(x) ? x.length : 0);
  const f = (count, one, many) => `${count} ${count === 1 ? one : many}`;
  return [f(n(data.events), 'event', 'events'), f(n(data.tasks), 'task', 'tasks'), f(n(data.research), 'research project', 'research projects')].join(', ');
}
