/* PINK CURSOR TRAIL — rebuilt from the "Water Breathing" cursor project.
   Same architecture (pooled particles: droplets → glow orbs, motes → tiny hearts/sparkles,
   mist wisps, breathing aura, burst on press) but the whole colour system is pink:
   hot pink, neon pink, rose, magenta and soft white. No blue, no cyan.
   • dark backgrounds  → additive blending, brighter
   • light surfaces ([data-trail="light"]) → normal blending, deeper/saturated pink
   • touch devices     → soft ripples + a few hearts instead of a cursor trail           */
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const TOUCH = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
const TAU = Math.PI * 2, rand = (a, b) => a + Math.random() * (b - a), pick = (a) => a[(Math.random() * a.length) | 0];

const DARK = [[255, 63, 120], [255, 20, 147], [255, 0, 170], [255, 158, 184], [255, 105, 160], [255, 248, 250]];   // hot, neon, magenta, rose, pink, white
const LIGHT = [[214, 20, 90], [235, 0, 120], [190, 0, 110], [255, 40, 110], [160, 10, 70]];                           // deeper so it reads on pink paper

let cv, ctx, W, H, dpr, mode = 'dark', baseMode = 'dark', raf = 0, alive = 0, enabled = true;
const P = { x: -999, y: -999, tx: -999, ty: -999, px: -999, py: -999, speed: 0, last: 0, seen: false };
const pool = []; const MAX = REDUCED ? 60 : TOUCH ? 90 : 420;
for (let i = 0; i < MAX; i++) pool.push({ on: false });
let head = 0;
const ripples = [];

function spawn(o) { const p = pool[head++ % MAX]; if (!p.on) alive++; Object.assign(p, { on: true, age: 0, rot: rand(0, TAU), spin: rand(-3, 3), sway: rand(0, TAU) }, o); }
function col(a) { return pick(mode === 'dark' ? DARK : LIGHT); }

function resize() {
  dpr = Math.min(devicePixelRatio || 1, TOUCH ? 1.5 : 2); W = innerWidth; H = innerHeight;
  cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
function heartPath(c, s) {
  c.beginPath(); c.moveTo(0, s * .35);
  c.bezierCurveTo(-s * .05, s * .05, -s * .6, s * .05, -s * .6, -s * .3);
  c.bezierCurveTo(-s * .6, -s * .65, -s * .1, -s * .7, 0, -s * .38);
  c.bezierCurveTo(s * .1, -s * .7, s * .6, -s * .65, s * .6, -s * .3);
  c.bezierCurveTo(s * .6, s * .05, s * .05, s * .05, 0, s * .35); c.closePath();
}
function sparklePath(c, s) {
  c.beginPath();
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = i % 2 ? s * .16 : s * .6; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
  c.closePath();
}


const sprites = new Map();
function sprite(t, c) {
  const key = t + c.join(); let cv = sprites.get(key); if (cv) return cv;
  cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d'), rgb = c.join(',');
  if (t === 0 || t === 3) {
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    if (t === 0) { gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.22, `rgba(${rgb},.85)`); gr.addColorStop(1, `rgba(${rgb},0)`); } else { gr.addColorStop(0, `rgba(${rgb},1)`); gr.addColorStop(1, `rgba(${rgb},0)`); }
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  } else {
    g.translate(32, 32); g.shadowColor = `rgb(${rgb})`; g.shadowBlur = 8; g.fillStyle = `rgb(${rgb})`;
    if (t === 1) heartPath(g, 34); else { sparklePath(g, 40); }
    g.fill(); g.shadowBlur = 0; if (t === 2) { g.fillStyle = 'rgba(255,255,255,.95)'; g.beginPath(); g.arc(0, 0, 3.5, 0, TAU); g.fill(); } else { g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(-6, -8, 5, 3, -.5, 0, TAU); g.fill(); }
  }
  sprites.set(key, cv); return cv;
}

function emit(dx, dy, sp, x, y) {
  const n = REDUCED ? 1 : Math.min(4, 1 + (sp / 14 | 0));
  for (let i = 0; i < n; i++) {
    const c = col(), a = rand(0, TAU), v = rand(8, 40) * (1 + sp * .02);
    // glow orb (the "droplet")
    spawn({ t: 0, x: x + rand(-3, 3), y: y + rand(-3, 3), vx: -dx * rand(.05, .2) + Math.cos(a) * v * .3, vy: -dy * rand(.05, .2) + Math.sin(a) * v * .3, life: rand(.45, .9), r: rand(3, 8), c });
  }
  if (!REDUCED && Math.random() < .5) {   // tiny heart or sparkle (the "mote")
    const c = Math.random() < .3 ? [255, 248, 250] : col(), heart = Math.random() < .62;
    spawn({ t: heart ? 1 : 2, x: x + rand(-6, 6), y: y + rand(-6, 6), vx: rand(-25, 25), vy: rand(-55, -15), life: rand(.8, 1.7), r: heart ? rand(5, 10) : rand(6, 12), c, grav: rand(-10, 30) });
  }
  if (!REDUCED && Math.random() < .22)    // soft fluid mist
    spawn({ t: 3, x, y, vx: rand(-14, 14), vy: rand(-22, -4), life: rand(.9, 1.6), r: rand(18, 36), c: col() });
}

function burst(x, y, n = 18) {
  n = REDUCED ? 4 : n;
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU), v = rand(60, 240), c = Math.random() < .25 ? [255, 248, 250] : col(), t = [0, 1, 1, 2][i % 4];
    spawn({ t, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, life: rand(.7, 1.4), r: t === 0 ? rand(3, 7) : rand(6, 12), c, grav: 80 });
  }
  kick();
}
function ripple(x, y) { ripples.push({ x, y, age: 0, life: .9 }); if (!REDUCED) for (let i = 0; i < 4; i++) spawn({ t: 1, x, y, vx: rand(-50, 50), vy: rand(-90, -30), life: rand(.8, 1.4), r: rand(6, 11), c: col(), grav: 20 }); kick(); }

function frame(now) {
  raf = 0;
  const dt = Math.min(.05, (now - (frame.t || now)) / 1000); frame.t = now;
  ctx.clearRect(0, 0, W, H);
  const dark = mode === 'dark';
  ctx.globalCompositeOperation = dark ? 'lighter' : 'source-over';
  // smooth pointer, spawn along the path
  if (!TOUCH && P.seen) {
    P.x += (P.tx - P.x) * Math.min(1, dt * 22); P.y += (P.ty - P.y) * Math.min(1, dt * 22);
    const dx = P.x - P.px, dy = P.y - P.py, d = Math.hypot(dx, dy); P.speed = d / Math.max(dt, .001) * .06;
    if (d > 1.5 && enabled) { const steps = Math.min(6, Math.ceil(d / 14)); for (let i = 1; i <= steps; i++) emit(dx, dy, d, P.px + dx * i / steps, P.py + dy * i / steps); }
    P.px = P.x; P.py = P.y;
    // breathing aura at the pointer
    const idle = now - P.last, br = .5 + .5 * Math.sin(now / 520), k = Math.min(1, 1.2 - idle / 4000);
    if (k > 0 && enabled) {
      const r = 20 + br * 12 + Math.min(18, P.speed * 2), c = dark ? '255,63,120' : '214,20,90';
      const g = ctx.createRadialGradient(P.x, P.y, 0, P.x, P.y, r * 2);
      g.addColorStop(0, `rgba(255,248,250,${.55 * k})`); g.addColorStop(.25, `rgba(${c},${.45 * k})`); g.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(P.x, P.y, r * 2, 0, TAU); ctx.fill();
    }
  }
  for (const p of pool) {
    if (!p.on) continue;
    p.age += dt; const k = p.age / p.life;
    if (k >= 1) { p.on = false; alive--; continue; }
    p.vy += (p.grav || 0) * dt; p.x += p.vx * dt + Math.sin(p.age * 5 + p.sway) * .35; p.y += p.vy * dt; p.vx *= .985; p.rot += p.spin * dt;
    const a = (k < .12 ? k / .12 : 1 - (k - .12) / .88), sp = sprite(p.t, p.c);
    if (p.t === 0) { const d = p.r * 4.8 * (1 - k * .4); ctx.globalAlpha = a; ctx.drawImage(sp, p.x - d / 2, p.y - d / 2, d, d); }
    else if (p.t === 3) { const d = p.r * 2 * (1 + k * 1.6); ctx.globalAlpha = a * (dark ? .2 : .14); ctx.drawImage(sp, p.x - d / 2, p.y - d / 2, d, d); }
    else {
      const d = p.r * 3.2 * (p.t === 1 ? 1 : 1 + Math.sin(p.age * 14) * .2) * (1 - k * .25); ctx.globalAlpha = a;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.t === 1 ? Math.sin(p.age * 3 + p.sway) * .4 : p.rot); ctx.drawImage(sp, -d / 2, -d / 2, d, d); ctx.restore();
    }
  }
  ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  for (let i = ripples.length - 1; i >= 0; i--) {   // touch ripples
    const r = ripples[i]; r.age += dt; const k = r.age / r.life; if (k >= 1) { ripples.splice(i, 1); continue; }
    const rad = 10 + k * 70, c = dark ? '255,63,120' : '214,20,90';
    ctx.strokeStyle = `rgba(${c},${(1 - k) * .8})`; ctx.lineWidth = 2.5 * (1 - k) + .5; ctx.beginPath(); ctx.arc(r.x, r.y, rad, 0, TAU); ctx.stroke();
    ctx.strokeStyle = `rgba(255,248,250,${(1 - k) * .5})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(r.x, r.y, rad * .62, 0, TAU); ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';
  const hot = alive > 0 || ripples.length || (!TOUCH && P.seen && performance.now() - P.last < 4500);
  if (hot) raf = requestAnimationFrame(frame); else ctx.clearRect(0, 0, W, H);
}
function kick() { if (!raf) { frame.t = 0; raf = requestAnimationFrame(frame); } }

function setMode(m) { mode = m; }
function onMove(e) {
  if (e.pointerType === 'touch') return;
  if (!P.seen) { P.x = P.px = e.clientX; P.y = P.py = e.clientY; P.seen = true; }
  P.tx = e.clientX; P.ty = e.clientY; P.last = performance.now();
  const el = e.target && e.target.closest ? e.target.closest('[data-trail]') : null;
  mode = el ? el.dataset.trail : baseMode; kick();
}

export const trail = {
  init() {
    cv = document.getElementById('trail'); ctx = cv.getContext('2d'); resize(); addEventListener('resize', resize);
    addEventListener('pointermove', onMove, { passive: true });
    addEventListener('pointerdown', (e) => {
      const el = e.target.closest && e.target.closest('[data-trail]'); mode = el ? el.dataset.trail : baseMode;
      if (e.pointerType === 'touch' || TOUCH) ripple(e.clientX, e.clientY); else burst(e.clientX, e.clientY, 14);
    }, { passive: true });
    addEventListener('pointermove', (e) => { if (e.pointerType === 'touch' && Math.random() < .35) { spawn({ t: 1, x: e.clientX, y: e.clientY, vx: rand(-30, 30), vy: rand(-60, -20), life: rand(.7, 1.2), r: rand(5, 9), c: col(), grav: 20 }); kick(); } }, { passive: true });
    document.addEventListener('pointerleave', () => { P.last = 0; });
  },
  /** Set the default background mode for the current chapter ('dark' | 'light'). */
  setBase(m) { baseMode = mode = m; },
  burst, ripple
};
