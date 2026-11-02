// Small effects: bead bursts, rolling numbers, and the screen wake lock.
const COLORS = ['var(--orange)', 'var(--butter)', 'var(--mint-d)', 'var(--pink-d)', 'var(--lav-d)'];

/* A short burst of beads from the middle of an element. Skipped when motion is off. */
export function burst(el, n = 14) {
  if (!el || document.documentElement.dataset.motion === 'off') return;
  const stage = document.getElementById('stage');
  const sr = stage.getBoundingClientRect(), r = el.getBoundingClientRect();
  const k = sr.width / 1920; // stage is scaled to fit the screen
  const box = document.createElement('div');
  box.className = 'burst';
  box.style.left = `${(r.left + r.width / 2 - sr.left) / k}px`;
  box.style.top = `${(r.top + r.height / 2 - sr.top) / k}px`;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.4, d = 60 + Math.random() * 70;
    const b = document.createElement('i');
    b.style.cssText = `background:${COLORS[i % COLORS.length]};--dx:${Math.round(Math.cos(a) * d)}px;--dy:${Math.round(Math.sin(a) * d)}px;animation-delay:${(Math.random() * 0.12).toFixed(2)}s`;
    box.appendChild(b);
  }
  stage.appendChild(box);
  setTimeout(() => box.remove(), 2000);
}

/* Slides a number to its new value instead of swapping it. */
export function setRoll(el, text) {
  if (el.dataset.v === text) return;
  const old = el.dataset.v;
  el.dataset.v = text;
  const off = document.documentElement.dataset.motion === 'off' || document.documentElement.dataset.mAmbient === 'off';
  if (old == null || off) { el.textContent = text; return; }
  el.innerHTML = `<span class="roll"><span class="o">${old}</span><span class="n">${text}</span></span>`;
  clearTimeout(el._rt);
  el._rt = setTimeout(() => { el.textContent = text; }, 700);
}

/* Keeps the screen on while the dashboard is visible. Resolves to a getter for the current state. */
export function keepAwake(onChange) {
  let lock = null;
  const state = { on: false, supported: 'wakeLock' in navigator };
  async function ask() {
    if (!state.supported || document.visibilityState !== 'visible' || lock) return;
    try {
      lock = await navigator.wakeLock.request('screen');
      state.on = true; onChange && onChange();
      lock.addEventListener('release', () => { lock = null; state.on = false; onChange && onChange(); });
    } catch { state.on = false; }
  }
  document.addEventListener('visibilitychange', ask);
  addEventListener('pointerdown', ask, { passive: true }); // some browsers only grant it after a touch
  ask();
  return state;
}
