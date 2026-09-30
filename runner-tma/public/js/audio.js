// =====================================================================
// Efectos de sonido sintetizados con WebAudio (0 KB de assets).
// El AudioContext se crea en el primer toque (política de autoplay).
// =====================================================================
let ctx = null;
let muted = false;
try { muted = localStorage.getItem('muted') === '1'; } catch { /* storage bloqueado */ }

export function unlockAudio() {
  if (ctx) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (AC) ctx = new AC();
}

export function isMuted() {
  return muted;
}

export function toggleMute() {
  muted = !muted;
  try { localStorage.setItem('muted', muted ? '1' : '0'); } catch { /* ignorar */ }
  return muted;
}

function tone(freq, dur, { type = 'square', vol = 0.06, slide = 0, delay = 0 } = {}) {
  if (muted || !ctx) return;
  if (ctx.state === 'suspended') ctx.resume();
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export const sfx = {
  coin: () => { tone(988, 0.05, { vol: 0.04 }); tone(1319, 0.08, { vol: 0.04, delay: 0.05 }); },
  jump: () => tone(300, 0.18, { type: 'triangle', slide: 400, vol: 0.07 }),
  roll: () => tone(220, 0.15, { type: 'triangle', slide: -120, vol: 0.07 }),
  move: () => tone(520, 0.04, { type: 'sine', vol: 0.03 }),
  crash: () => { tone(160, 0.35, { type: 'sawtooth', slide: -110, vol: 0.12 }); tone(90, 0.4, { type: 'square', vol: 0.08 }); },
  power: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.09, { vol: 0.05, delay: i * 0.07 })),
  buy: () => [784, 1047].forEach((f, i) => tone(f, 0.1, { type: 'triangle', vol: 0.06, delay: i * 0.08 })),
};
