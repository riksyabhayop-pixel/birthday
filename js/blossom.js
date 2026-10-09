/* CHAPTER 2 — THE GARDEN OF MEMORIES
   The original "Interactive Blossom" CSS flowers (stems → leaves → petals → glowing lights)
   are kept intact; this module adds: continuous flower generation, floating hearts, and the
   photo system — photographs emerge from flower centres, petals, stems and light particles,
   float up and outward with the flowers, rotate, drift away and fade.               */
import { birthdayConfig as C, t } from './config.js';
import { Ambient } from './ambient.js';
import { memories, photoImg } from './photos.js';
import { trail } from './cursorTrail.js';

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const MOBILE = matchMedia('(max-width: 720px)').matches;
const rand = (a, b) => a + Math.random() * (b - a), pick = (a) => a[(Math.random() * a.length) | 0];

const FLOWER_HTML = `<div class="flower-top">${[1,2,3,4,5,6,7,8].map(i=>`<div class="flower-petal flower-petal__${i}"></div>`).join('')}<div class="flower-circle"></div>${[1,2,3,4,5,6,7,8].map(i=>`<div class="flower-light flower-light__${i}"></div>`).join('')}</div>
<div class="flower-bottom"><div class="flower-stem"></div>${[1,2,3,4,5,6].map(i=>`<div class="flower-leaf flower-leaf__${i}"></div>`).join('')}${[1,2,3,4].map(i=>`<div class="flower-grass flower-grass__${i}"></div>`).join('')}</div>`;

export function createBlossom(ctx) {
  const root = ctx.el, $ = (s) => root.querySelector(s);
  const ground = $('#blGround'), photosLayer = $('#blPhotos'), msg = $('#blMsg'), glow = $('.bl-ground-glow'), mist = $('.bl-mist');
  const hearts = new Ambient($('#blHearts'), { count: MOBILE ? 20 : 38, shapes: ['heart', 'heart', 'dot', 'spark'], alpha: .85, size: [10, 30], speed: 1.1 });
  let active = false, timers = [], flowers = [], live = [], nextPhoto = 0, mx = 0, my = 0, tl = null;
  const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.push(id); return id; };
  const every = (fn, ms) => { const id = setInterval(fn, ms); timers.push(id); return id; };

  function addFlower(style, animate = false) {
    const el = document.createElement('div'); el.className = 'flower-container'; el.innerHTML = FLOWER_HTML;
    if (style) Object.assign(el.style, style); ground.appendChild(el); flowers.push(el);
    if (animate) bloom(el); return el;
  }
  function bloom(el) { el.classList.add('animate'); el._t = performance.now(); }

  /* ---- photos ---- */
  function origin(fl) {
    const kinds = ['circle', 'circle', 'petal', 'stem', 'light']; const k = pick(kinds); let q;
    if (k === 'petal') q = pick([...fl.querySelectorAll('.flower-petal')]);
    else if (k === 'stem') q = fl.querySelector('.flower-stem');
    else if (k === 'light') q = pick([...fl.querySelectorAll('.flower-light')]);
    else q = fl.querySelector('.flower-circle');
    const r = q.getBoundingClientRect(); if (!r.width && !r.height) return null;
    return { x: r.left + r.width / 2, y: k === 'stem' ? r.top + r.height * .15 : r.top + r.height / 2, k };
  }
  function spawnPhoto() {
    if (!active || live.length >= (MOBILE ? 3 : 5)) return;
    const ready = flowers.filter((f) => f._t && performance.now() - f._t > 3800 && f.isConnected); if (!ready.length) return;
    const fl = pick(ready), o = origin(fl); if (!o) return;
    const idx = nextPhoto++ % memories.length, depth = rand(.35, 1), W = innerWidth, H = innerHeight;
    const card = document.createElement('div'); card.className = 'bl-photo'; const inner = document.createElement('span'); inner.className = 'bl-photo__inner';
    inner.appendChild(photoImg(idx)); card.appendChild(inner); photosLayer.appendChild(card);
    const sc = (MOBILE ? .85 : 1) * (.8 + depth * .5);
    const dirX = (o.x < W / 2 ? -1 : 1) * rand(.1, 1), endX = o.x + dirX * rand(W * .08, W * .28), endY = -rand(H * .1, H * .3);
    const rot = rand(-16, 16), life = REDUCED ? 5 : rand(7.5, 10.5);
    gsap.set(card, { x: o.x, y: o.y, xPercent: -50, yPercent: -50, scale: 0, rotation: rot - 30, opacity: 0, transformOrigin: '50% 50%' });
    const item = { card, inner, depth }; live.push(item);
    hearts.burst(o.x, o.y, REDUCED ? 3 : 12, ['heart', 'dot', 'spark']); if (!REDUCED) trail.burst && 0;
    const tl2 = gsap.timeline({ onComplete: () => { card.remove(); live.splice(live.indexOf(item), 1); } });
    tl2.to(card, { scale: sc, opacity: 1, rotation: rot, duration: REDUCED ? .2 : 1.1, ease: 'back.out(1.8)' }, 0)
      .to(card, { x: endX, y: endY, duration: life, ease: 'sine.inOut' }, .2)
      .to(card, { rotation: rot + rand(-14, 14), duration: life, ease: 'sine.inOut' }, .2)
      .to(card, { opacity: 0, scale: sc * .85, duration: 1.8, ease: 'power1.in' }, Math.max(.5, life - 1.6));
    item.tl = tl2;
  }
  const onMove = (e) => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5;
    live.forEach(({ inner, depth }) => gsap.to(inner, { x: -mx * 46 * depth, y: -my * 34 * depth, rotationY: mx * 18 * depth, rotationX: -my * 14 * depth, duration: .8, overwrite: 'auto' })); };

  /* ---- continuous flowers ---- */
  function newFlower() {
    if (!active) return;
    const dynamic = flowers.filter((f) => f._dyn && f.isConnected);
    if (dynamic.length >= (MOBILE ? 12 : 20)) { const old = dynamic[0]; flowers.splice(flowers.indexOf(old), 1); gsap.to(old, { opacity: 0, duration: 1.6, onComplete: () => old.remove() }); }
    const el = addFlower({ left: rand(6, 94).toFixed(1) + '%', top: rand(22, 96).toFixed(1) + '%', width: rand(4.5, 9).toFixed(1) + '%', opacity: 0 }); el._dyn = true;
    gsap.to(el, { opacity: 1, duration: 1.2 }); bloom(el);
  }

  function reset() {
    timers.forEach((id) => { clearTimeout(id); clearInterval(id); }); timers = []; tl && tl.kill();
    live.forEach((l) => { l.tl && l.tl.kill(); l.card.remove(); }); live = []; photosLayer.replaceChildren(); ground.replaceChildren(); flowers = []; nextPhoto = 0;
    ground.style.animation = 'none'; void ground.offsetWidth; ground.style.animation = '';   // restart the camera pull-back
    gsap.set(msg, { opacity: 0, y: 14 }); gsap.set([glow, mist], { opacity: 0 });
  }
  return {
    enter() {
      active = true; reset(); hearts.start(); trail.setBase('dark');
      for (let i = 0; i < 12; i++) addFlower();                      // the original twelve, positioned by the original CSS
      tl = gsap.timeline();
      tl.to(glow, { opacity: 1, duration: 2.4, ease: 'power2.out' }, .2).to(mist, { opacity: 1, duration: 3 }, .6);   // 1. ground appears
      later(() => bloom(flowers[0]), 900);                                                    // 2-6. stems, leaves, petals, lights
      later(() => { bloom(flowers[1]); bloom(flowers[2]); let rest = flowers.slice(3);
        every(() => { if (!rest.length) return; bloom(rest.splice((Math.random() * rest.length) | 0, 1)[0]); }, 420); }, 3400);
      later(() => { every(newFlower, MOBILE ? 2200 : 1500); }, 9500);                         // 8. more flowers continuously
      later(() => { spawnPhoto(); every(spawnPhoto, REDUCED ? 3200 : 2600); }, 6200);         // memories growing out of flowers
      msg.textContent = t(C.blossom.message);
      tl.to(msg, { opacity: 1, y: 0, duration: 2, ease: 'power2.out' }, 8.5);
      later(() => ctx.unlock(), 11000);
      addEventListener('pointermove', onMove, { passive: true });
    },
    exit() { active = false; timers.forEach((id) => { clearTimeout(id); clearInterval(id); }); timers = []; hearts.stop(); removeEventListener('pointermove', onMove); live.forEach((l) => l.tl && l.tl.pause()); }
  };
}
