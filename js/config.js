// On-device settings. Stored only in this browser's localStorage, never in the repo.
const KEY = 'cs.config.v1';

export const DEFAULTS = {
  name: '',
  lat: 15.0,      // generic Pampanga default; set your real coordinates in Settings
  lon: 120.7,
  backend: '',    // Google Apps Script web app URL (see apps-script/README.md)
  token: '',
  theme: 'light', // light | night | auto
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
