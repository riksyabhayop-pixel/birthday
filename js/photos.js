/* Photo helpers shared by every chapter. Photos come from birthdayConfig.photos.
   If a file is missing, an elegant placeholder is drawn instead — nothing breaks. */
import { birthdayConfig } from './config.js';
export const memories = birthdayConfig.photos;
const cache = new Map();

export function placeholderURL(i) {
  const cv = document.createElement('canvas'); cv.width = 400; cv.height = 500; const g = cv.getContext('2d');
  const gr = g.createRadialGradient(200, 210, 10, 200, 250, 340); gr.addColorStop(0, '#ff3f78'); gr.addColorStop(.6, '#8f1235'); gr.addColorStop(1, '#26000f');
  g.fillStyle = gr; g.fillRect(0, 0, 400, 500);
  g.fillStyle = 'rgba(255,248,250,.9)'; g.font = '600 34px Georgia, serif'; g.textAlign = 'center'; g.fillText('Photo ' + (i + 1), 200, 285);
  g.font = '18px sans-serif'; g.fillStyle = 'rgba(255,248,250,.65)'; g.fillText('add photo' + (i + 1) + '.jpg', 200, 320);
  return cv.toDataURL('image/jpeg', .8);
}
/** Create an <img> for DOM chapters (falls back to placeholder on 404). */
export function photoImg(i) {
  const m = memories[i % memories.length], img = new Image();
  img.alt = m.alt || m.caption || ''; img.decoding = 'async'; img.draggable = false;
  img.onerror = () => { img.onerror = null; img.src = placeholderURL(i % memories.length); };
  img.src = m.src; return img;
}
function loadImg(i) {
  return new Promise((res) => {
    const img = new Image(); img.crossOrigin = 'anonymous';
    img.onload = () => res(img);
    img.onerror = () => { const p = new Image(); p.onload = () => res(p); p.src = placeholderURL(i); };
    img.src = memories[i].src;
  });
}
/** A rounded, glass-framed card painted to a canvas (used as a WebGL texture). */
export async function framedCard(i) {
  i = i % memories.length;
  if (cache.has(i)) return cache.get(i);
  const p = (async () => {
    const img = await loadImg(i), W = 400, H = 500, pad = 14, R = 34;
    const cv = document.createElement('canvas'); cv.width = W + pad * 2; cv.height = H + pad * 2; const g = cv.getContext('2d');
    g.translate(pad, pad);
    const rr = (x, y, w, h, r) => { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h); };
    g.save(); g.shadowColor = 'rgba(255,63,120,.8)'; g.shadowBlur = 22; g.fillStyle = '#26000f'; rr(0, 0, W, H, R); g.fill(); g.restore();
    g.save(); rr(7, 7, W - 14, H - 14, R - 6); g.clip();
    const s = Math.max((W - 14) / img.width, (H - 14) / img.height), w = img.width * s, h = img.height * s;
    g.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
    const sh = g.createLinearGradient(0, 0, W, H); sh.addColorStop(0, 'rgba(255,255,255,.22)'); sh.addColorStop(.4, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(255,63,120,.18)');
    g.fillStyle = sh; g.fillRect(0, 0, W, H); g.restore();
    const bd = g.createLinearGradient(0, 0, W, H); bd.addColorStop(0, '#fff8fa'); bd.addColorStop(.5, '#ff9eb8'); bd.addColorStop(1, '#ff3f78');
    g.strokeStyle = bd; g.lineWidth = 5; rr(2.5, 2.5, W - 5, H - 5, R); g.stroke();
    return { canvas: cv, aspect: cv.width / cv.height };
  })();
  cache.set(i, p); return p;
}
