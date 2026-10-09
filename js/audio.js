/* One persistent <audio> element for the entire experience.
   Chapters never touch it, so music can never restart on a chapter change. */
import { birthdayConfig } from './config.js';

const el = document.getElementById('bgm');
const btn = document.getElementById('musicBtn');
const vol = document.getElementById('volume');
const wrap = document.getElementById('music');

let muted = false, started = false, target = birthdayConfig.musicVolume ?? 0.55;
el.src = birthdayConfig.music; el.loop = true; el.volume = 0;
vol.value = target;

function fadeTo(v, ms = 1800) {
  const from = el.volume, t0 = performance.now();
  const step = (now) => {
    const k = Math.min(1, (now - t0) / ms);
    el.volume = Math.max(0, Math.min(1, from + (v - from) * k));
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
function paint() {
  btn.classList.toggle('is-muted', muted);
  btn.setAttribute('aria-pressed', String(muted));
  btn.setAttribute('aria-label', muted ? 'Unmute music' : 'Mute music');
}

export const audio = {
  get playing() { return started && !el.paused; },
  /** Try to play immediately. Resolves true if the browser allowed it. */
  async tryAutoplay() {
    try { await el.play(); started = true; fadeTo(muted ? 0 : target); return true; }
    catch { return false; }
  },
  /** Call from a user gesture. Safe to call repeatedly. */
  async start() {
    if (started && !el.paused) return true;
    try { await el.play(); started = true; fadeTo(muted ? 0 : target); return true; }
    catch (e) { console.warn('Audio could not start:', e); return false; }
  },
  showControls() { wrap.classList.add('is-on'); },
  toggle() { muted = !muted; fadeTo(muted ? 0 : target, 500); paint(); }
};

btn.addEventListener('click', () => { if (!started) audio.start(); else audio.toggle(); });
vol.addEventListener('input', () => {
  target = parseFloat(vol.value);
  if (target > 0 && muted) { muted = false; paint(); }
  if (target === 0) { muted = true; paint(); }
  el.volume = muted ? 0 : target;
});
paint();
