// Live forecast from Open-Meteo (free, no key, CORS-enabled). Falls back to the last good copy, then to sample data.
const CACHE = 'cs.weather.v1';

export async function loadWeather(cfg, fallback) {
  const url = 'https://api.open-meteo.com/v1/forecast'
    + `?latitude=${encodeURIComponent(cfg.lat)}&longitude=${encodeURIComponent(cfg.lon)}`
    + '&hourly=temperature_2m,relative_humidity_2m,precipitation'
    + '&forecast_days=2&timezone=Asia%2FManila';
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`weather HTTP ${res.status}`);
    const j = await res.json();
    const h = j.hourly;
    const fill = (arr, i0, n, dflt) => {
      const out = [];
      let last = dflt;
      for (let i = 0; i < n; i++) {
        const v = arr[i0 + i];
        last = v == null ? last : v;
        out.push(last);
      }
      return out;
    };
    const data = {
      temp: fill(h.temperature_2m, 0, 24, 28),
      rh: fill(h.relative_humidity_2m, 0, 24, 75),
      precipFull: fill(h.precipitation, 0, 48, 0), // mm per hour, today + tomorrow (Manila time)
      at: Date.now(),
    };
    try { localStorage.setItem(CACHE, JSON.stringify(data)); } catch { /* storage unavailable */ }
    return { ...data, source: 'live' };
  } catch (err) {
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE) || 'null');
      if (cached) return { ...cached, source: 'cache' };
    } catch { /* ignore */ }
    return { ...fallback, source: 'sample', error: String(err.message || err) };
  }
}
