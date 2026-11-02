// Companions: DNA (default), Mosquito, Shade, Orbit, Pulse, Keycap. Switch in Settings.
// All six are pure HTML/SVG + CSS (css/companions.css), so they work offline and cost almost nothing.
const RUNG_COLORS = ['#FF6B3D', '#FFD95E', '#A8E0C8', '#FF8FA3', '#C9BEF8'];

export const COMPANIONS = [
  { id: 'dna', name: 'DNA', blurb: 'Rotating helix. Base pairs light up while things happen.' },
  { id: 'mosquito', name: 'Mosquito', blurb: 'Banded Aedes in a hover. Bobs while it watches over you.' },
  { id: 'shade', name: 'Shade', blurb: 'A drifting shadow spirit with one glowing eye.' },
  { id: 'orbit', name: 'Orbit', blurb: 'A core with three satellites for camera, printer and calendar.' },
  { id: 'pulse', name: 'Pulse', blurb: 'A ring that ripples like a voice.' },
  { id: 'keycap', name: 'Keycap', blurb: 'An orange key with a live waveform. It presses on every milestone.' },
];

const dna = () => `<div class="dna"><div class="dna-glow"></div>${Array.from({ length: 10 }, (_, i) =>
  `<div class="dna-rung" style="--d:${(-i * 0.4).toFixed(1)}s;--c:${RUNG_COLORS[i % RUNG_COLORS.length]}"><b></b><i class="da"></i><i class="db"></i></div>`).join('')}</div>`;

const mosquito = () => `<div class="cmp" style="display:flex;align-items:center;justify-content:center"><svg width="210" height="210" viewBox="0 0 200 200" fill="none"><g class="mq-bob">
  <g stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M100 96L66 116L44 138" opacity="0.55"/><path d="M118 96L150 112L170 138" opacity="0.55"/><path d="M104 98L90 128L76 162"/><path d="M110 100L112 134L104 166"/><path d="M116 98L132 126L146 156"/></g>
  <g stroke="#FFFFFF" stroke-width="3" stroke-linecap="butt" stroke-dasharray="2 11"><path d="M104 98L90 128L76 162"/><path d="M110 100L112 134L104 166"/><path d="M116 98L132 126L146 156"/></g>
  <g transform="translate(108 80) rotate(-118)"><ellipse class="mq-w" cx="36" cy="0" rx="36" ry="9" fill="#C9BEF8" fill-opacity="0.5" stroke="currentColor" stroke-opacity="0.45" stroke-width="1.5"/></g>
  <g transform="translate(108 80) rotate(-146)"><ellipse class="mq-w" cx="36" cy="0" rx="36" ry="9" fill="#A8E0C8" fill-opacity="0.6" stroke="currentColor" stroke-opacity="0.45" stroke-width="1.5" style="animation-delay:-0.07s"/></g>
  <g transform="rotate(28 70 112)"><clipPath id="mqab"><ellipse cx="70" cy="112" rx="40" ry="14"/></clipPath><ellipse cx="70" cy="112" rx="40" ry="14" fill="#FF6B3D"/><g clip-path="url(#mqab)" fill="#FFFFFF"><rect x="50" y="96" width="5" height="32"/><rect x="65" y="96" width="5" height="32"/><rect x="80" y="96" width="5" height="32"/></g></g>
  <circle cx="110" cy="92" r="17" fill="currentColor"/><path d="M104 82Q110 92 104 102M116 82Q110 92 116 102" stroke="#FFFFFF" stroke-opacity="0.8" stroke-width="2" stroke-linecap="round"/>
  <circle cx="134" cy="84" r="9" fill="currentColor"/><circle cx="137" cy="81" r="3" fill="#A8E0C8"/><path d="M141 87L172 104" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M136 76Q142 62 152 58" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></g></svg></div>`;

const shade = () => `<div class="cmp">
  <div style="position:absolute;left:25px;top:25px;width:160px;height:160px;border-radius:50%;background:radial-gradient(circle,rgba(110,88,200,0.30) 0%,transparent 70%)"></div>
  <div class="sh-w" style="position:absolute;left:62px;top:150px;width:26px;height:26px;border-radius:50%;background:#4A3A92"></div>
  <div class="sh-w" style="position:absolute;left:98px;top:156px;width:20px;height:20px;border-radius:50%;background:#4A3A92;animation-delay:-1.2s"></div>
  <div class="sh-w" style="position:absolute;left:128px;top:150px;width:16px;height:16px;border-radius:50%;background:#4A3A92;animation-delay:-2.4s"></div>
  <div class="sh-body" style="position:absolute;left:45px;top:28px;width:120px;height:132px;background:radial-gradient(circle at 38% 28%,#7C68CC 0%,#4A3A92 55%,#2E2262 100%);box-shadow:0 14px 28px rgba(60,44,130,0.4)"><div class="sh-eye" style="position:absolute;left:33px;top:50px;width:54px;height:12px;border-radius:6px;background:#A8E0C8;box-shadow:0 0 14px 3px rgba(168,224,200,0.7)"></div></div></div>`;

const orbit = () => `<div class="cmp">
  <div class="ob-glow" style="position:absolute;left:5px;top:5px;width:200px;height:200px;border-radius:50%;background:radial-gradient(circle,rgba(255,122,77,0.30) 0%,rgba(255,122,77,0.08) 52%,transparent 72%)"></div>
  <div style="position:absolute;left:15px;top:15px;width:180px;height:180px;border-radius:50%;border:1px solid rgba(128,120,110,0.4)"></div>
  <div style="position:absolute;left:35px;top:35px;width:140px;height:140px;border-radius:50%;border:1px solid rgba(128,120,110,0.4)"></div>
  <div style="position:absolute;left:52px;top:52px;width:106px;height:106px;border-radius:50%;border:1px dashed rgba(128,120,110,0.4)"></div>
  <div class="ob-a" style="position:absolute;left:15px;top:15px;width:180px;height:180px"><span style="position:absolute;left:50%;top:-9px;margin-left:-9px;width:18px;height:18px;border-radius:50%;background:#A8E0C8;box-shadow:0 4px 10px rgba(0,0,0,0.2)"></span></div>
  <div class="ob-b" style="position:absolute;left:35px;top:35px;width:140px;height:140px"><span style="position:absolute;left:50%;top:-7px;margin-left:-7px;width:14px;height:14px;border-radius:50%;background:#C9BEF8;box-shadow:0 4px 10px rgba(0,0,0,0.2)"></span></div>
  <div class="ob-c" style="position:absolute;left:52px;top:52px;width:106px;height:106px"><span style="position:absolute;left:50%;top:-6px;margin-left:-6px;width:12px;height:12px;border-radius:50%;background:#FFD95E;box-shadow:0 4px 10px rgba(0,0,0,0.2)"></span></div>
  <div style="position:absolute;left:67px;top:67px;width:76px;height:76px"><div class="ob-blob" style="width:76px;height:76px;background:radial-gradient(circle at 32% 28%,#FFD2B8 0%,#FF8A5B 38%,#FF6B3D 70%,#E4501F 100%);box-shadow:0 10px 24px rgba(255,107,61,0.45)"></div>
  <div style="position:absolute;left:17px;top:13px;width:22px;height:12px;border-radius:50%;background:rgba(255,255,255,0.55);filter:blur(1px)"></div></div></div>`;

const pulse = () => `<div class="cmp" style="display:flex;align-items:center;justify-content:center"><svg width="210" height="210" viewBox="0 0 200 200">${Array.from({ length: 12 }, (_, i) =>
  `<g transform="rotate(${i * 30} 100 100)"><rect class="pl" x="97" y="14" width="7" height="28" rx="3.5" fill="${i % 2 ? '#FF9B7A' : '#FF6B3D'}" style="animation-delay:${(-i * 0.2).toFixed(1)}s"/></g>`).join('')}
  <circle cx="100" cy="100" r="32" fill="#FF6B3D"/><ellipse cx="90" cy="88" rx="11" ry="6" fill="#FFFFFF" fill-opacity="0.5"/></svg></div>`;

const keycap = () => `<div class="cmp" style="display:flex;align-items:center;justify-content:center"><div style="position:relative;width:170px;height:170px">
  <div style="position:absolute;left:0;top:22px;width:170px;height:148px;border-radius:38px;background:#D4471C;box-shadow:0 14px 24px rgba(40,70,110,0.28)"></div>
  <div class="kc-top" style="position:absolute;left:10px;top:0;width:150px;height:142px;border-radius:32px;background:linear-gradient(180deg,#FF8A5B,#FF6B3D);box-shadow:0 2px 0 rgba(255,255,255,0.5) inset"><div style="position:absolute;left:0;right:0;top:34px;display:flex;align-items:flex-end;justify-content:center;gap:9px;height:56px">${[-0.2, -0.5, -0.8, -0.35].map((d) => `<div class="kc-bar" style="width:12px;height:56px;border-radius:6px;background:#1D1B16;animation-delay:${d}s"></div>`).join('')}</div></div></div></div>`;

const MAKE = { dna, mosquito, shade, orbit, pulse, keycap };

export function mountCompanion(el, kind = 'dna') {
  const make = MAKE[kind] || dna;
  el.innerHTML = make();
  el.dataset.kind = MAKE[kind] ? kind : 'dna';
}
export const mountDna = (el) => mountCompanion(el, 'dna');

/* Pace: scales every running animation inside the companion (1 = normal, 2 = twice as fast). */
export function setPace(el, rate = 1) {
  try {
    el.getAnimations({ subtree: true }).forEach((a) => a.updatePlaybackRate(rate));
  } catch { /* Web Animations not available: companion simply keeps its normal pace */ }
}

/* A short happy wiggle, used for reactions. */
export function cheer(el) {
  el.classList.remove('cheer');
  void el.offsetWidth; // restart the animation
  el.classList.add('cheer');
  setTimeout(() => el.classList.remove('cheer'), 1400);
}
