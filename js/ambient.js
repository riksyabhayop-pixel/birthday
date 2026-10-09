/* Shared ambient particle field — one visual language for every chapter:
   pink, rose, white, subtle gold, occasional red. Cheap sprite blitting,
   a single rAF loop per field, and it only runs while its chapter is active. */
export const PALETTE = [
  [255, 63, 120], [255, 63, 120], [255, 158, 184], [255, 158, 184], [255, 248, 250],
  [255, 213, 138], [200, 18, 60]
];
const sprites = new Map();
function sprite(kind, c) {
  const key = kind + c.join();
  if (sprites.has(key)) return sprites.get(key);
  const s = 64, cv = document.createElement('canvas'); cv.width = cv.height = s;
  const g = cv.getContext('2d'), rgb = c.join(',');
  if (kind === 'dot') {
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, `rgba(255,255,255,.95)`); gr.addColorStop(.18, `rgba(${rgb},.9)`); gr.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = gr; g.fillRect(0, 0, s, s);
  } else if (kind === 'heart') {
    const gr = g.createRadialGradient(32, 28, 2, 32, 32, 30);
    gr.addColorStop(0, '#fff'); gr.addColorStop(.35, `rgb(${rgb})`); gr.addColorStop(1, `rgba(${rgb},.55)`);
    g.shadowColor = `rgba(${rgb},.9)`; g.shadowBlur = 8; g.fillStyle = gr;
    g.beginPath(); g.moveTo(32, 52);
    g.bezierCurveTo(8, 36, 10, 14, 24, 14); g.bezierCurveTo(29, 14, 32, 18, 32, 22);
    g.bezierCurveTo(32, 18, 35, 14, 40, 14); g.bezierCurveTo(54, 14, 56, 36, 32, 52); g.fill();
  } else {
    g.fillStyle = `rgb(${rgb})`; g.shadowColor = `rgb(${rgb})`; g.shadowBlur = 10;
    g.beginPath();
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 - Math.PI / 2, r = i % 2 ? 4 : 22; g.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r); }
    g.closePath(); g.fill();
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 8); gr.addColorStop(0, '#fff'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, s, s);
  }
  sprites.set(key, cv); return cv;
}
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[(Math.random() * a.length) | 0];

export class Ambient {
  constructor(canvas, o = {}) {
    this.cv = canvas; this.ctx = canvas.getContext('2d');
    this.o = { count: 60, shapes: ['dot', 'heart', 'spark'], rise: true, speed: 1, size: [8, 26], alpha: .8, ...o };
    this.p = []; this.raf = 0; this.t = 0; this.running = false;
    this._resize = () => this.resize(); addEventListener('resize', this._resize); this.resize();
    for (let i = 0; i < this.o.count; i++) this.p.push(this.make(true));
  }
  resize() {
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    this.w = this.cv.clientWidth || innerWidth; this.h = this.cv.clientHeight || innerHeight;
    this.cv.width = this.w * dpr; this.cv.height = this.h * dpr; this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  make(anywhere) {
    const o = this.o;
    return { x: rnd(0, this.w), y: anywhere ? rnd(0, this.h) : (o.rise ? this.h + 30 : rnd(0, this.h)),
      vx: rnd(-.15, .15) * o.speed, vy: (o.rise ? -rnd(.15, .7) : rnd(-.1, .1)) * o.speed, s: rnd(o.size[0], o.size[1]),
      a: rnd(.25, 1), ph: rnd(0, 6.28), tw: rnd(.6, 2.2), kind: pick(o.shapes), c: pick(PALETTE), rot: rnd(-.5, .5), life: 1 };
  }
  burst(x, y, n = 24, kinds = ['heart', 'dot', 'spark']) {
    for (let i = 0; i < n; i++) {
      const a = rnd(0, 6.28), v = rnd(1.5, 5.5);
      this.p.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.5, s: rnd(10, 26), a: 1, ph: 0, tw: 0, kind: pick(kinds), c: pick(PALETTE), rot: rnd(-1, 1), life: 1, burst: true });
    }
  }
  start() { if (this.running) return; this.running = true; this.resize(); this.last = performance.now(); this.raf = requestAnimationFrame(this.loop = this.loop.bind(this)); }
  stop() { this.running = false; cancelAnimationFrame(this.raf); this.ctx.clearRect(0, 0, this.w, this.h); }
  destroy() { this.stop(); removeEventListener('resize', this._resize); }
  loop(now) {
    if (!this.running) return;
    const dt = Math.min(2.5, (now - this.last) / 16.67); this.last = now; this.t += dt * .016;
    const c = this.ctx; c.clearRect(0, 0, this.w, this.h); c.globalCompositeOperation = 'lighter';
    for (let i = this.p.length - 1; i >= 0; i--) {
      const q = this.p[i];
      q.x += (q.vx + Math.sin(this.t * q.tw + q.ph) * .25) * dt; q.y += q.vy * dt;
      if (q.burst) { q.vy += .09 * dt; q.vx *= .985; q.life -= .014 * dt; if (q.life <= 0) { this.p.splice(i, 1); continue; } }
      else if (q.y < -40 || q.y > this.h + 50 || q.x < -40 || q.x > this.w + 40) { Object.assign(q, this.make(false)); }
      const tw = q.burst ? q.life : (.55 + .45 * Math.sin(this.t * 3 * q.tw + q.ph));
      c.globalAlpha = Math.max(0, q.a * tw * this.o.alpha);
      const sp = sprite(q.kind, q.c), s = q.s * (q.kind === 'dot' ? 1.6 : 1);
      if (q.kind === 'heart' || q.kind === 'spark') {
        c.save(); c.translate(q.x, q.y); c.rotate(q.rot + (q.kind === 'spark' ? this.t * q.tw : Math.sin(this.t + q.ph) * .3)); c.drawImage(sp, -s / 2, -s / 2, s, s); c.restore();
      } else c.drawImage(sp, q.x - s / 2, q.y - s / 2, s, s);
    }
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    this.raf = requestAnimationFrame(this.loop);
  }
}
