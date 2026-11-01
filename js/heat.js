// Heat index (Rothfusz regression, NWS) and PAGASA classification.
// Inputs in °C and % relative humidity, output in °C. This is a computed estimate, not an official PAGASA reading.
export function heatIndexC(tC, rh) {
  const t = tC * 9 / 5 + 32;
  let hi = 0.5 * (t + 61 + (t - 68) * 1.2 + rh * 0.094);
  if ((hi + t) / 2 >= 80) {
    hi = -42.379 + 2.04901523 * t + 10.14333127 * rh - 0.22475541 * t * rh
      - 0.00683783 * t * t - 0.05481717 * rh * rh + 0.00122874 * t * t * rh
      + 0.00085282 * t * rh * rh - 0.00000199 * t * t * rh * rh;
    if (rh < 13 && t >= 80 && t <= 112) hi -= ((13 - rh) / 4) * Math.sqrt((17 - Math.abs(t - 95)) / 17);
    else if (rh > 85 && t >= 80 && t <= 87) hi += ((rh - 85) / 10) * ((87 - t) / 5);
  }
  return (hi - 32) * 5 / 9;
}

export const BANDS = [
  { min: 52, label: 'Extreme danger', cls: 'danger' },
  { min: 42, label: 'Danger', cls: 'danger' },
  { min: 33, label: 'Extreme caution', cls: 'xcaution' },
  { min: 27, label: 'Caution', cls: 'caution' },
  { min: -Infinity, label: 'Comfortable', cls: 'ok' },
];

export function bandFor(hiC) {
  return BANDS.find((b) => hiC >= b.min);
}
