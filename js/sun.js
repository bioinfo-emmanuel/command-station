// Sunrise and sunset from coordinates (no network), plus the little sun/moon arc under the clock.
const D2R = Math.PI / 180, R2D = 180 / Math.PI;
const mod = (a, n) => ((a % n) + n) % n;

function event(date, lat, lon, rising) {
  const y = date.getFullYear(), m = date.getMonth(), d = date.getDate();
  const N = Math.floor((Date.UTC(y, m, d) - Date.UTC(y, 0, 0)) / 86400000);
  const lngHour = lon / 15;
  const t = N + ((rising ? 6 : 18) - lngHour) / 24;
  const M = 0.9856 * t - 3.289;
  const L = mod(M + 1.916 * Math.sin(M * D2R) + 0.020 * Math.sin(2 * M * D2R) + 282.634, 360);
  let RA = mod(R2D * Math.atan(0.91764 * Math.tan(L * D2R)), 360);
  RA = (RA + (Math.floor(L / 90) * 90 - Math.floor(RA / 90) * 90)) / 15;
  const sinDec = 0.39782 * Math.sin(L * D2R), cosDec = Math.cos(Math.asin(sinDec));
  const cosH = (Math.cos(90.833 * D2R) - sinDec * Math.sin(lat * D2R)) / (cosDec * Math.cos(lat * D2R));
  if (cosH > 1 || cosH < -1) return null; // polar day or night
  const H = (rising ? 360 - R2D * Math.acos(cosH) : R2D * Math.acos(cosH)) / 15;
  const T = H + RA - 0.06571 * t - 6.622;
  const UT = mod(T - lngHour, 24);
  let when = new Date(Date.UTC(y, m, d) + UT * 3600000);
  const dayStart = new Date(y, m, d).getTime();
  while (when.getTime() < dayStart) when = new Date(when.getTime() + 86400000);
  while (when.getTime() >= dayStart + 86400000) when = new Date(when.getTime() - 86400000);
  return when;
}

export function sunTimes(date, lat, lon) {
  return { rise: event(date, lat, lon, true), set: event(date, lat, lon, false) };
}

const fmt = (d) => `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() >= 12 ? 'PM' : 'AM'}`;
const span = (ms) => { const m = Math.round(ms / 60000); return `${Math.floor(m / 60)} h ${m % 60} m`; };
const bez = (t) => { // quadratic arc from (12,50) via (118,-26) to (224,50)
  const a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t;
  return [a * 12 + b * 118 + c * 224, a * 50 + b * -26 + c * 50];
};

/* Returns the arc as SVG markup; shows the sun by day and a moon at night. */
export function renderSunArc(now, lat, lon) {
  const { rise, set } = sunTimes(now, lat, lon);
  if (!rise || !set) return '';
  let night = false, t, label;
  if (now >= rise && now <= set) {
    t = (now - rise) / (set - rise);
    label = `Sunset in ${span(set - now)}`;
  } else {
    night = true;
    const prevSet = now < rise ? new Date(set.getTime() - 86400000) : set;
    const nextRise = now < rise ? rise : new Date(rise.getTime() + 86400000);
    t = (now - prevSet) / (nextRise - prevSet);
    label = `Sunrise in ${span(nextRise - now)}`;
  }
  t = Math.min(Math.max(t, 0.02), 0.98);
  const [x, y] = bez(t);
  const body = night
    ? `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="12" style="fill:var(--lav-d);opacity:0.22" class="sunhalo"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7.2" style="fill:var(--lav);stroke:var(--lav-d);stroke-width:2.2"/><circle cx="${(x + 3).toFixed(1)}" cy="${(y - 2.4).toFixed(1)}" r="5.2" style="fill:var(--card)"/>`
    : `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="12" style="fill:var(--orange)" class="sunhalo"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7.2" style="fill:var(--butter);stroke:var(--orange);stroke-width:2.2"/>`;
  const done = night ? '' : `<path d="M12 50Q118 -26 224 50" stroke-width="3.4" stroke-linecap="round" stroke-dasharray="${(t * 270).toFixed(0)} 400" style="stroke:var(--butter)"/>`;
  return `<svg width="236" height="66" viewBox="0 0 236 66" fill="none" role="img" aria-label="${night ? 'Moon' : 'Sun'} arc: sunrise ${fmt(rise)}, sunset ${fmt(set)}. ${label}">
    <path d="M12 50Q118 -26 224 50" stroke-width="3" stroke-linecap="round" stroke-dasharray="1 7" style="stroke:var(--muted);opacity:0.55"/>${done}
    <line x1="6" y1="50" x2="230" y2="50" stroke-width="2" stroke-linecap="round" style="stroke:var(--hair)"/>${body}
    <text x="12" y="63" font-size="12" font-weight="700" style="fill:var(--muted)">${fmt(rise)}</text>
    <text x="224" y="63" font-size="12" font-weight="700" text-anchor="end" style="fill:var(--muted)">${fmt(set)}</text>
    <text x="118" y="46" font-size="12" font-weight="700" text-anchor="middle" style="fill:var(--muted)">${label}</text></svg>`;
}
