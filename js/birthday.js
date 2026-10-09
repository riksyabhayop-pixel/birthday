/* CHAPTER 4 — THE BIRTHDAY TREE
   A modern canvas + GSAP rebuild of the old jQuery/JScex "Birthday Animation":
   a heart seed falls, the ground draws itself, the trunk and branches grow along the original
   bezier data, ~700 glowing pink blossoms fill a heart-shaped canopy, petals fall, and the
   birthday message is revealed. No JScex, no jQuery, one rAF loop that stops when hidden.   */
import { birthdayConfig as C, t } from './config.js';
import { trail } from './cursorTrail.js';

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const MOBILE = matchMedia('(max-width: 720px)').matches;
const rand = (a, b) => a + Math.random() * (b - a), clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const easeBack = (k) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };

// Branch data taken from the original project: [x1,y1, x2,y2, x3,y3, radius, length, children]
const TREE = [[535, 680, 570, 250, 500, 200, 30, 100, [[540, 500, 455, 417, 340, 400, 13, 100, [[450, 435, 434, 430, 394, 395, 2, 40]]], [550, 445, 600, 356, 680, 345, 12, 100, [[578, 400, 648, 409, 661, 426, 3, 80]]], [539, 281, 537, 248, 534, 217, 3, 40], [546, 397, 413, 247, 328, 244, 9, 80, [[427, 286, 383, 253, 371, 205, 2, 40], [498, 345, 435, 315, 395, 330, 4, 60]]], [546, 357, 608, 252, 678, 221, 6, 100, [[590, 293, 646, 277, 648, 271, 2, 80]]]]]];
const LW = 1100, LH = 700, TREE_X = 535;
const bez = (p, t) => { const a = (1 - t) * (1 - t), b = 2 * t * (1 - t), c = t * t; return { x: a * p[0].x + b * p[1].x + c * p[2].x, y: a * p[0].y + b * p[1].y + c * p[2].y }; };
function flatten(list, parent, out) {
  list.forEach(([x1, y1, x2, y2, x3, y3, r, len, kids]) => {
    const o = { p: [{ x: x1, y: y1 }, { x: x2, y: y2 }, { x: x3, y: y3 }], r, dur: len * .03, start: 0, prog: 0 };
    if (parent) { let best = 0, bd = 1e9; for (let k = 0; k <= 40; k++) { const q = bez(parent.p, k / 40), d = Math.hypot(q.x - x1, q.y - y1); if (d < bd) { bd = d; best = k / 40; } } o.start = parent.start + parent.dur * best; }
    out.push(o); if (kids) flatten(kids, o, out);
  }); return out;
}
const inHeart = (x, y, r) => { x /= r; y /= r; const a = x * x + y * y - 1; return a * a * a - x * x * y * y * y < 0; };

function makeSprites() {
  const cols = ['#ff9eb8', '#ff3f78', '#ffd4df', '#ff7aa3', '#ffeef3', '#e0457b']; return cols.map((c) => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 72; const g = cv.getContext('2d'); g.translate(36, 36);
    g.shadowColor = c; g.shadowBlur = 10; for (let i = 0; i < 5; i++) { g.save(); g.rotate(i * 1.2566); const gr = g.createRadialGradient(0, -12, 1, 0, -12, 14); gr.addColorStop(0, '#fff'); gr.addColorStop(.5, c); gr.addColorStop(1, c); g.fillStyle = gr; g.globalAlpha = .92; g.beginPath(); g.ellipse(0, -12, 8, 13, 0, 0, 6.2832); g.fill(); g.restore(); }
    g.shadowBlur = 0; g.globalAlpha = 1; g.fillStyle = '#ffd58a'; g.beginPath(); g.arc(0, 0, 4, 0, 6.2832); g.fill(); return cv;
  });
}
function heartPath(g, s) { g.beginPath(); g.moveTo(0, s * .9); g.bezierCurveTo(-s * 1.3, -s * .1, -s * .7, -s * 1.1, 0, -s * .45); g.bezierCurveTo(s * .7, -s * 1.1, s * 1.3, -s * .1, 0, s * .9); g.closePath(); }

export function createBirthday(ctx) {
  const root = ctx.el, cv = root.querySelector('#bdCanvas'), g = cv.getContext('2d'), seedBtn = root.querySelector('#bdSeedBtn'), textEl = root.querySelector('#bdText'), titleEl = root.querySelector('#bdTitle'), subEl = root.querySelector('#bdSub');
  const layer = document.createElement('canvas'), lg = layer.getContext('2d'), sprites = makeSprites();
  let W, H, dpr, s, ox, oy, branches, blossoms, petals, raf = 0, active = false, phase = 'seed', t0 = 0, last = 0, seedY = 300, seedS = 1, groundK = 0, treeEnd = 0, bloomStart = 0, started = 0, autoT = 0, textDone = false, tl = null;

  function layout() {
    dpr = Math.min(devicePixelRatio || 1, MOBILE ? 1.5 : 2); W = cv.clientWidth || innerWidth; H = cv.clientHeight || innerHeight;
    cv.width = layer.width = W * dpr; cv.height = layer.height = H * dpr;
    const wide = W > 900; s = wide ? Math.min(W * .58 / 720, H * .86 / LH) : Math.min(W * 1.02 / 720, H * .6 / LH);
    const cx = wide ? W * .64 : W * .5; ox = cx - TREE_X * s; oy = H - LH * s - H * .02;
    seedBtn.style.left = cx + 'px'; seedBtn.style.top = oy + 330 * s + 'px'; rebuildLayer();
  }
  function trunkSeg(p0, p1, b) {
    const n = Math.max(2, Math.ceil((p1 - p0) * b.dur * 50)); for (let k = 0; k <= n; k++) {
      const tt = p0 + (p1 - p0) * k / n, q = bez(b.p, tt), r = b.r * .5 * (1 - tt * .8) + 1;
      lg.fillStyle = '#3a0818'; lg.beginPath(); lg.arc(q.x, q.y, r, 0, 6.2832); lg.fill();
      lg.fillStyle = 'rgba(255,120,160,.22)'; lg.beginPath(); lg.arc(q.x - r * .28, q.y - r * .1, r * .42, 0, 6.2832); lg.fill();
    }
  }
  function rebuildLayer() { lg.setTransform(1, 0, 0, 1, 0, 0); lg.clearRect(0, 0, layer.width, layer.height); lg.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy); (branches || []).forEach((b) => b.prog > 0 && trunkSeg(0, b.prog, b)); }
  function reset() {
    branches = flatten(TREE, null, []); treeEnd = Math.max(...branches.map((b) => b.start + b.dur));
    const n = MOBILE ? 380 : 720; blossoms = []; const R = 190, cxh = 535, cyh = 292;
    while (blossoms.length < n) { const x = rand(-1.2, 1.2) * R, y = rand(-1.15, 1.3) * R; if (!inHeart(x, y, R)) continue;
      blossoms.push({ x: cxh + x, y: cyh - y, s: rand(11, 27), spr: sprites[(Math.random() * sprites.length) | 0], rot: rand(0, 6.28), sw: rand(.6, 1.6), ph: rand(0, 6.28), d: Math.random() }); }
    blossoms.forEach((b) => { b.d = b.d * 3.4 + (1 - clamp((b.y - 40) / 430)) * 0 + (b.y > 400 ? .6 : 0); });
    petals = []; phase = 'seed'; seedY = 300; seedS = 1; groundK = 0; textDone = false; layout();
    gsap.set(textEl, { opacity: 1 }); titleEl.innerHTML = ''; t(C.birthday.headline).split(' ').forEach((word, wi, arr) => { const w = document.createElement('span'); w.style.cssText = 'display:inline-block;white-space:nowrap'; [...word].forEach((ch) => { const sp = document.createElement('span'); sp.textContent = ch; w.appendChild(sp); }); titleEl.appendChild(w); if (wi < arr.length - 1) titleEl.appendChild(document.createTextNode(' ')); });
    subEl.textContent = t(C.birthday.sub); gsap.set(subEl, { opacity: 0, y: 12 }); gsap.set(titleEl.querySelectorAll('span span'), { opacity: 0, y: 24, filter: 'blur(10px)' });
    seedBtn.textContent = C.birthday.seedHint; seedBtn.classList.remove('is-gone');
  }
  function start() {
    if (phase !== 'seed') return; phase = 'fall'; seedBtn.classList.add('is-gone'); clearTimeout(autoT); trail.burst(innerWidth * (W > 900 ? .64 : .5), oy + 300 * s, 16);
    const o = { y: 300, sc: 1, gk: 0 }; gsap.to(o, { y: 668, sc: .34, duration: REDUCED ? .1 : 1.5, ease: 'power2.in', onUpdate: () => { seedY = o.y; seedS = o.sc; },
      onComplete: () => { phase = 'grow'; started = performance.now(); } });
    gsap.to({ k: 0 }, { k: 1, duration: REDUCED ? .1 : 1.4, delay: .5, onUpdate() { groundK = this.targets()[0].k; } });
  }
  function drawSeed(tm) {
    const beat = 1 + Math.sin(tm * 4) * .06 * (phase === 'seed' ? 1 : 0);
    g.save(); g.translate(TREE_X, seedY); g.scale(seedS * beat * 1, seedS * beat * 1); const R = 22;
    const gl = g.createRadialGradient(0, 0, 2, 0, 0, R * 3); gl.addColorStop(0, 'rgba(255,63,120,.55)'); gl.addColorStop(1, 'rgba(255,63,120,0)'); g.fillStyle = gl; g.beginPath(); g.arc(0, 0, R * 3, 0, 6.2832); g.fill();
    const gr = g.createRadialGradient(-6, -8, 2, 0, 0, R * 1.4); gr.addColorStop(0, '#ffd4df'); gr.addColorStop(.4, '#ff3f78'); gr.addColorStop(1, '#8f1235'); g.fillStyle = gr; heartPath(g, R); g.fill(); g.restore();
  }
  function frame(now) {
    if (!active) return; raf = requestAnimationFrame(frame); const dt = Math.min(.05, (now - last) / 1000); last = now; const tm = now / 1000;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
    // grow
    let gt = 0; if (phase === 'grow' || phase === 'bloom' || phase === 'done') {
      gt = (now - started) / 1000; lg.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
      for (const b of branches) { const p = clamp((gt - b.start) / (REDUCED ? .2 : b.dur)); if (p > b.prog) { trunkSeg(b.prog, p, b); b.prog = p; } }
      if (phase === 'grow' && gt > treeEnd * .55) { phase = 'bloom'; bloomStart = gt; }
    }
    g.drawImage(layer, 0, 0);
    g.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
    // ground
    if (groundK > 0) { const w = 640 * groundK, gl = g.createLinearGradient(TREE_X - w, 0, TREE_X + w, 0); gl.addColorStop(0, 'rgba(255,63,120,0)'); gl.addColorStop(.5, 'rgba(255,158,184,.95)'); gl.addColorStop(1, 'rgba(255,63,120,0)');
      g.fillStyle = gl; g.fillRect(TREE_X - w, 679, w * 2, 3); const eg = g.createRadialGradient(TREE_X, 684, 0, TREE_X, 684, w); eg.addColorStop(0, 'rgba(255,63,120,.35)'); eg.addColorStop(1, 'rgba(255,63,120,0)'); g.fillStyle = eg; g.save(); g.translate(0, 684); g.scale(1, .12); g.translate(0, -684); g.beginPath(); g.arc(TREE_X, 684, w, 0, 6.2832); g.fill(); g.restore(); }
    if (phase === 'seed' || phase === 'fall') drawSeed(tm);
    // blossoms
    if (phase === 'bloom' || phase === 'done') {
      const bt = gt - bloomStart; let allIn = true;
      for (const b of blossoms) {
        const k = clamp((bt - b.d) / .9); if (k < 1) allIn = false; if (k <= 0) continue; const e = easeBack(k), sz = b.s * e * 1.5;
        g.save(); g.translate(b.x, b.y); g.rotate(b.rot + Math.sin(tm * b.sw + b.ph) * .18); g.globalAlpha = (.72 + .28 * Math.sin(tm * b.sw * 1.6 + b.ph)) * clamp(k * 2); g.drawImage(b.spr, -sz / 2, -sz / 2, sz, sz); g.restore();
      }
      g.globalAlpha = 1;
      if (!REDUCED && petals.length < (MOBILE ? 24 : 55) && Math.random() < dt * 9) { const b = blossoms[(Math.random() * blossoms.length) | 0]; if (clamp((bt - b.d) / .9) >= 1) petals.push({ x: b.x, y: b.y, vx: rand(-14, 14), vy: rand(14, 34), r: rand(0, 6.28), vr: rand(-2, 2), s: rand(8, 15), spr: b.spr, ph: rand(0, 6.28) }); }
      for (let i = petals.length - 1; i >= 0; i--) { const p = petals[i]; p.y += p.vy * dt; p.x += p.vx * dt + Math.sin(tm * 2 + p.ph) * .35; p.r += p.vr * dt; if (p.y > 676) { petals.splice(i, 1); continue; }
        g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.globalAlpha = .8 * clamp((676 - p.y) / 60); g.drawImage(p.spr, -p.s / 2, -p.s / 2, p.s, p.s); g.restore(); }
      g.globalAlpha = 1;
      if (allIn && phase === 'bloom') { phase = 'done'; }
      if (!textDone && bt > 1.6) { textDone = true; reveal(); }
    }
  }


function reveal() {
  tl = gsap.timeline();

  // Make sure the complete headline is visible
  gsap.set(titleEl, {
    opacity: 1,
    visibility: 'visible',
    y: 0,
    filter: 'blur(0px)'
  });

  // Reveal any animated headline characters
  const titleChars = titleEl.querySelectorAll('span span');

  if (titleChars.length > 0) {
    gsap.set(titleChars, {
      opacity: 1,
      visibility: 'visible',
      y: 0,
      filter: 'blur(0px)'
    });
  }

  // Type the subtitle after showing the headline
  const message = t(C.birthday.sub);

  tl.call(() => {
    subEl.textContent = '';

    gsap.set(subEl, {
      opacity: 1,
      visibility: 'visible',
      y: 0
    });

    const cursor = document.createElement('span');
    cursor.className = 'bd-typing-cursor';
    cursor.textContent = '|';
    subEl.appendChild(cursor);

    let i = 0;

    function typeNext() {
      if (!active || !subEl.isConnected) return;

      if (i < message.length) {
        cursor.before(document.createTextNode(message.charAt(i)));
        i++;
        setTimeout(typeNext, 38);
      } else {
        cursor.remove();
      }
    }

    typeNext();
  });

  tl.call(() => ctx.unlock());
}
  const onClick = () => start(); const onKey = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); start(); } };
  cv.addEventListener('click', onClick); seedBtn.addEventListener('click', start); addEventListener('resize', () => { if (active) layout(); });
  return {
    enter() { active = true; reset(); trail.setBase('dark'); last = performance.now(); raf = requestAnimationFrame(frame); autoT = setTimeout(start, 9000); },
    exit() { active = false; cancelAnimationFrame(raf); clearTimeout(autoT); tl && tl.kill(); g.clearRect(0, 0, cv.width, cv.height); }
  };
}
