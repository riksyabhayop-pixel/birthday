/* CHAPTER 6 — THE GIFT (finale)
   Keeps the cinematic GSAP-timeline approach of the "Interactive Birthday Gift" project
   (flood of colour, masked kinetic headline, particle hearts / blossoms forming a heart,
   replay) but the interaction is now a magical gift box you open: light beam, hearts, petals
   and photographs pour out, a heart of ~900 glowing petals forms, then the birthday message. */
import { birthdayConfig as C, t } from './config.js';
import { Ambient } from './ambient.js';
import { memories, photoImg } from './photos.js';
import { trail } from './cursorTrail.js';

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const MOBILE = matchMedia('(max-width: 720px)').matches;
const rand = (a, b) => a + Math.random() * (b - a), clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = (k) => 1 - Math.pow(1 - k, 3);

function makeSprites() {
  const hearts = ['#ff3f78', '#ff9eb8', '#ffd4df', '#e0457b', '#c8123c'], out = [];
  hearts.forEach((c) => { const cv = document.createElement('canvas'); cv.width = cv.height = 56; const g = cv.getContext('2d'); g.translate(28, 30); g.shadowColor = c; g.shadowBlur = 8; g.fillStyle = c;
    g.beginPath(); g.moveTo(0, 16); g.bezierCurveTo(-22, 0, -14, -18, 0, -7); g.bezierCurveTo(14, -18, 22, 0, 0, 16); g.fill(); out.push(cv); });
  ['#ff9eb8', '#ffd4df', '#ff3f78', '#fff8fa'].forEach((c) => { const cv = document.createElement('canvas'); cv.width = cv.height = 56; const g = cv.getContext('2d'); g.translate(28, 28); g.shadowColor = c; g.shadowBlur = 8;
    for (let i = 0; i < 5; i++) { g.save(); g.rotate(i * 1.2566); g.fillStyle = c; g.globalAlpha = .92; g.beginPath(); g.ellipse(0, -9, 6, 10, 0, 0, 6.2832); g.fill(); g.restore(); } g.shadowBlur = 0; g.fillStyle = '#ffd58a'; g.beginPath(); g.arc(0, 0, 3, 0, 6.2832); g.fill(); out.push(cv); });
  return out;
}
const SPOTS_D = [[7, 22, -8], [92, 20, 7], [4, 58, 5], [95, 58, -6], [11, 84, 8], [88, 85, -7]];
const SPOTS_M = [[10, 13, -8], [86, 11, 7], [6, 79, 5], [90, 82, -6], [48, 6, 3]];

export function createGift(ctx) {
  const root = ctx.el, $ = (id) => root.querySelector('#' + id);
  const stars = new Ambient($('gfCanvas'), { count: MOBILE ? 30 : 70, shapes: ['dot', 'spark', 'heart'], alpha: .75, rise: true, speed: .8, size: [6, 20] });
  const heartCv = document.createElement('canvas'); heartCv.className = 'gf-heart'; root.insertBefore(heartCv, $('gfPhotos')); const hg = heartCv.getContext('2d');
  const lead = $('gfLead'), gift = $('gfGift'), tap = $('gfTap'), flood = $('gfFlood'), photosEl = $('gfPhotos'), fin = $('gfFinal'), head = $('gfHeadline'), msg = $('gfMsg'), thanks = $('gfThanks'), closing = $('gfClosing'), sign = $('gfSign'), replay = $('gfReplay');
  const lid = root.querySelector('.gf-lid'), box = root.querySelector('.gf-box'), beam = root.querySelector('.gf-beam'), glowEl = root.querySelector('.gf-glow');
  const sprites = makeSprites(); const G = C.gift;
  let active = false, opened = false, tl = null, raf = 0, last = 0, petals = [], hs = { on: false, t0: 0, glow: 0, scale: 1, cx: 0, cy: 0, R: 0 }, W = 0, H = 0, dpr = 1, live = [], timers = [], mx = 0, my = 0;
  const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.push(id); return id; };

  function size() { dpr = Math.min(devicePixelRatio || 1, MOBILE ? 1.5 : 2); W = root.clientWidth || innerWidth; H = root.clientHeight || innerHeight; heartCv.width = W * dpr; heartCv.height = H * dpr; hs.R = Math.min(W * .8, H * .62) / 2.05; hs.cx = W / 2; hs.cy = H * .5; }
  function giftCenter() { const r = box.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height * .25 }; }
  function buildPetals(from) {
    const n = MOBILE ? 480 : 950; petals = []; const k = hs.R / 17;
    for (let i = 0; i < n; i++) {
      const tt = rand(0, 6.2832), outline = Math.random() < .55, rf = outline ? rand(.82, 1.02) : Math.sqrt(Math.random()) * .85;
      const hx = 16 * Math.pow(Math.sin(tt), 3), hy = 13 * Math.cos(tt) - 5 * Math.cos(2 * tt) - 2 * Math.cos(3 * tt) - Math.cos(4 * tt);
      const a = rand(0, 6.2832), v = rand(80, 520);
      petals.push({ sx: from.x, sy: from.y, tx: hs.cx + hx * k * rf, ty: hs.cy - hy * k * rf - hs.R * .08, bx: from.x + Math.cos(a) * v * rand(.4, 1), by: from.y + Math.sin(a) * v * rand(.4, 1) - rand(60, 240),
        delay: rand(0, 1.8), spr: sprites[(Math.random() * sprites.length) | 0], s: rand(10, 22) * (outline ? 1.1 : .9), rot: rand(0, 6.28), vr: rand(-1.5, 1.5), ph: rand(0, 6.28) });
    }
  }
  function frame(now) {
    if (!active) return; raf = requestAnimationFrame(frame); const tm = now / 1000; hg.setTransform(dpr, 0, 0, dpr, 0, 0); hg.clearRect(0, 0, W, H);
    if (!hs.on) return; const el = tm - hs.t0, beat = 1 + Math.pow(Math.max(0, Math.sin(el * 2.6)), 6) * .035 * clamp(el / 4);
    if (hs.glow > 0) { const gr = hg.createRadialGradient(hs.cx, hs.cy, 0, hs.cx, hs.cy, hs.R * 1.6); gr.addColorStop(0, `rgba(255,63,120,${.38 * hs.glow})`); gr.addColorStop(.5, `rgba(255,63,120,${.14 * hs.glow})`); gr.addColorStop(1, 'rgba(255,63,120,0)'); hg.fillStyle = gr; hg.fillRect(0, 0, W, H); }
    const dx = (mx - .5) * 10, dy = (my - .5) * 8;
    for (const p of petals) {
      const k = clamp((el - p.delay) / 2.4); if (k <= 0) continue; let x, y;
      if (k < .35) { const kk = ease(k / .35); x = p.sx + (p.bx - p.sx) * kk; y = p.sy + (p.by - p.sy) * kk; }
      else { const kk = ease((k - .35) / .65); const bx = p.bx, by = p.by; x = bx + (p.tx - bx) * kk; y = by + (p.ty - by) * kk; }
      const fl = k >= 1 ? Math.sin(tm * 1.4 + p.ph) * 2.2 : 0;
      x = hs.cx + (x - hs.cx) * hs.scale * beat + fl + dx * .4; y = hs.cy + (y - hs.cy) * hs.scale * beat + Math.cos(tm * 1.2 + p.ph) * (k >= 1 ? 2 : 0) + dy * .4;
      const sz = p.s * (.6 + .4 * clamp(k * 3)) * hs.scale;
      hg.save(); hg.translate(x, y); hg.rotate(p.rot + p.vr * tm * (k >= 1 ? .3 : 1)); hg.globalAlpha = clamp(k * 4) * (k >= 1 ? .78 + .22 * Math.sin(tm * 2 + p.ph) : 1); hg.drawImage(p.spr, -sz / 2, -sz / 2, sz, sz); hg.restore();
    }
    hg.globalAlpha = 1;
  }
  function spawnPhotos(origin) {
    const spots = MOBILE ? SPOTS_M : SPOTS_D, n = Math.min(spots.length, memories.length);
    for (let i = 0; i < n; i++) {
      const [px, py, rot] = spots[i], card = document.createElement('div'); card.className = 'gf-photo'; const inn = document.createElement('span'); inn.className = 'gf-photo__in'; inn.appendChild(photoImg(i + 1)); card.appendChild(inn); photosEl.appendChild(card);
      const X = W * px / 100, Y = H * py / 100; gsap.set(card, { x: origin.x, y: origin.y, xPercent: -50, yPercent: -50, scale: 0, rotation: rot - 40, opacity: 0 });
      const item = { card, inn, d: rand(.4, 1) }; live.push(item);
      const tw = gsap.timeline({ delay: 1.2 + i * .28 });
      tw.to(card, { x: X, y: Y, scale: (MOBILE ? 1 : 1.25) * (.85 + item.d * .3), rotation: rot, opacity: 1, duration: REDUCED ? .2 : 1.8, ease: 'power3.out' })
        .add(() => { if (!REDUCED) gsap.to(card, { y: '+=' + rand(-16, 16), rotation: rot + rand(-4, 4), duration: rand(3.2, 5), yoyo: true, repeat: -1, ease: 'sine.inOut' }); });
    }
  }
  const onMove = (e) => { mx = e.clientX / innerWidth; my = e.clientY / innerHeight; live.forEach(({ inn, d }) => gsap.to(inn, { x: -(mx - .5) * 40 * d, y: -(my - .5) * 28 * d, duration: .8, overwrite: 'auto' })); };

  function open() {
    if (opened || !active) return; opened = true; gift.disabled = true; const c = giftCenter();
    gsap.killTweensOf([lid, box, gift]); box.style.animation = 'none';
    const tlo = tl = gsap.timeline();
    tlo.to(tap, { opacity: 0, duration: .3 }, 0).to(lead, { opacity: 0, y: -10, duration: .6 }, 0)
      .to(gift, { x: REDUCED ? 0 : '+=0', duration: 0 }, 0);
    if (!REDUCED) tlo.to(box, { keyframes: [{ rotation: -3 }, { rotation: 3 }, { rotation: -2.5 }, { rotation: 2.5 }, { rotation: 0 }], duration: .6, ease: 'none' }, 0);
    tlo.add(() => { trail.burst(c.x, c.y, 34); stars.burst(c.x, c.y, REDUCED ? 8 : 60); }, REDUCED ? 0 : .6)
      .to(lid, { y: -H * .5, rotation: -28, opacity: 0, duration: REDUCED ? .2 : 1.1, ease: 'power3.in' }, REDUCED ? 0 : .6)
      .to(beam, { scaleY: 1, opacity: 1, duration: .7, ease: 'power3.out' }, REDUCED ? 0 : .65)
      .to(glowEl, { scale: 3, opacity: 1, duration: 1, ease: 'power2.out' }, REDUCED ? 0 : .65)
      .to(flood, { opacity: .9, duration: .35, ease: 'power2.in' }, REDUCED ? 0 : 1.1).to(flood, { opacity: 0, duration: 1.4, ease: 'power2.out' }, REDUCED ? .2 : 1.45)
      .add(() => { buildPetals(giftCenter()); hs.on = true; hs.t0 = performance.now() / 1000; spawnPhotos(giftCenter()); }, REDUCED ? .2 : 1.3)
      .to(hs, { glow: 1, duration: 3, ease: 'power2.out' }, REDUCED ? .2 : 1.5)
      .to(beam, { opacity: 0, duration: 1.6 }, REDUCED ? .4 : 2.4)
      .to(gift, { y: H * .16, scale: .6, opacity: 0, duration: 1.8, ease: 'power2.in' }, REDUCED ? .4 : 2.2)
      .add(() => reveal(), REDUCED ? .6 : 4.4);
  }
  function reveal() {
    tl = gsap.timeline(); fin.classList.add('is-on');
    tl.to(hs, { scale: .78, duration: 2.2, ease: 'power2.inOut' }, 0);
    tl.to(head.querySelectorAll('.w'), { rotateX: 0, y: 0, duration: REDUCED ? .1 : 1.2, stagger: REDUCED ? 0 : .14, ease: 'power4.out' }, .3);
    tl.to(msg.children, { opacity: 1, y: 0, duration: REDUCED ? .1 : 1.4, stagger: REDUCED ? 0 : 1.1, ease: 'power2.out' }, REDUCED ? .2 : 1.9);
    const after = REDUCED ? .3 : 1.9 + msg.children.length * 1.1 + .6;
    tl.to(thanks, { opacity: 1, y: 0, duration: 1.4 }, after).to(closing, { opacity: 1, y: 0, duration: 1.4 }, after + 1.3).to(sign, { opacity: 1, y: 0, duration: 1.6 }, after + 2.5).to(replay, { opacity: 1, duration: 1.2 }, after + 3.4);
    tl.add(() => { replay.focus({ preventScroll: true }); }, after + 3.6);
  }
  function reset() {
    tl && tl.kill(); timers.forEach(clearTimeout); timers = []; opened = false; hs.on = false; hs.glow = 0; hs.scale = 1; petals = []; live.forEach((l) => gsap.killTweensOf(l.card)); live = []; photosEl.replaceChildren();
    lead.textContent = t(G.lead); tap.textContent = t(G.tapHint); thanks.textContent = t(G.thanks); closing.textContent = t(G.closing); sign.textContent = t(G.signature); replay.textContent = t(G.replayLabel);
    msg.replaceChildren(); G.message.forEach((l) => { const p = document.createElement('p'); p.textContent = t(l); msg.appendChild(p); });
    head.replaceChildren(); t(G.headline).split(' ').forEach((w, i, a) => { const m = document.createElement('span'); m.className = 'mask'; const s = document.createElement('span'); s.className = 'w'; s.textContent = w; m.appendChild(s); head.appendChild(m); if (i < a.length - 1) head.appendChild(document.createTextNode(' ')); });
    gsap.set(head.querySelectorAll('.w'), { rotateX: -100, y: '110%' }); gsap.set([...msg.children, thanks, closing, sign], { opacity: 0, y: 14 }); gsap.set(replay, { opacity: 0 });
    gsap.set([lead, tap, flood, beam], { opacity: 0 }); gsap.set(beam, { scaleY: 0 }); gsap.set(lead, { y: 12 }); gsap.set(gift, { opacity: 0, y: 40, scale: .7, x: 0, clearProps: 'rotation' }); gsap.set(lid, { clearProps: 'all' }); gsap.set(box, { rotation: 0 }); box.style.animation = ''; gsap.set(glowEl, { scale: 1, opacity: 1 });
    fin.classList.remove('is-on'); gift.disabled = false;
  }
  gift.addEventListener('click', open);
  replay.addEventListener('click', () => ctx.restart());
  addEventListener('resize', () => { if (active) { size(); if (hs.on) { const was = hs.scale; buildPetals({ x: hs.cx, y: hs.cy }); petals.forEach((p) => { p.delay = -5; }); hs.scale = was; } } });
  return {
    enter() {
      active = true; reset(); size(); stars.start(); trail.setBase('dark'); last = performance.now(); raf = requestAnimationFrame(frame); addEventListener('pointermove', onMove, { passive: true });
      tl = gsap.timeline({ delay: REDUCED ? 0 : .9 });
      tl.to(lead, { opacity: 1, y: 0, duration: REDUCED ? .1 : 2, ease: 'power2.out' }, 0).to(gift, { opacity: 1, y: 0, scale: 1, duration: REDUCED ? .1 : 2, ease: 'back.out(1.4)' }, REDUCED ? 0 : 1.2).to(tap, { opacity: 1, duration: 1.2 }, REDUCED ? 0 : 3.4);
      later(() => gift.focus({ preventScroll: true }), 3500);
    },
    exit() { active = false; stars.stop(); cancelAnimationFrame(raf); tl && tl.kill(); timers.forEach(clearTimeout); removeEventListener('pointermove', onMove); hg.clearRect(0, 0, W, H); }
  };
}
