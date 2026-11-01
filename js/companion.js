// DNA companion (default). More styles (mosquito, shade, orbit, pulse, keycap) arrive with the Settings PR.
const RUNG_COLORS = ['#FF6B3D', '#FFD95E', '#A8E0C8', '#FF8FA3', '#C9BEF8'];

export function mountDna(el) {
  const rungs = Array.from({ length: 10 }, (_, i) =>
    `<div class="dna-rung" style="--d:${(-i * 0.4).toFixed(1)}s;--c:${RUNG_COLORS[i % RUNG_COLORS.length]}"><b></b><i class="da"></i><i class="db"></i></div>`
  ).join('');
  el.innerHTML = `<div class="dna"><div class="dna-glow"></div>${rungs}</div>`;
}
