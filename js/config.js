// On-device settings. Stored only in this browser's localStorage, never in the repo.
const KEY = 'cs.config.v1';

export const DEFAULTS = {
  name: '',
  lat: 15.0,      // generic Pampanga default; set your real coordinates in Settings
  lon: 120.7,
  backend: '',    // Google Apps Script web app URL (see apps-script/README.md)
  token: '',
  theme: 'light', // light | night | auto
  companion: 'dna',
  // Motion switches (all on by default except weather moods)
  motion: true,   // false = everything static
  mIcons: true,   // animated card icons
  mAmbient: true, // breathing, rolling numbers, crossfades, load-in, glance rotation
  mSun: true,     // sun and moon arc under the clock
  mMoods: false,  // companion and heat widget react to the weather
  pomoChime: true,
  // Optional tiles in the right column
  tileWriting: false,
  tileFocus: false,
};

export function loadConfig() {
  try {
    const raw = localStorage.getItem(KEY);
    return { ...DEFAULTS, ...(raw ? JSON.parse(raw) : {}) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveConfig(cfg) {
  try {
    localStorage.setItem(KEY, JSON.stringify(cfg));
    return true;
  } catch {
    return false;
  }
}

export function resetConfig() {
  try { localStorage.removeItem(KEY); } catch { /* storage unavailable */ }
  return { ...DEFAULTS };
}
