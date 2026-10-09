/* CHAPTER 1 — THE LETTER
   Ported from the "Proposal Letter" project: draw the bow, aim, release, arrow physics,
   envelope hit, letter window, YES / escaping NO button, pixel cat. Wrapped as a chapter
   module (no globals), restartable, with a pixel Cupid added and a cinematic dark scene. */
import { birthdayConfig as C, t } from './config.js';
import { Ambient } from './ambient.js';
import { trail } from './cursorTrail.js';

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const MOBILE = matchMedia('(max-width: 720px)').matches;

const PAL = { k: '#221d1c', w: '#fdfdfd', p: '#15110f', r: '#e23b4e', d: '#b22a3b', n: '#ff8fa3', c: '#ffb3c1', h: '#ffd58a', s: '#ffd4df', o: '#ff9eb8', x: '#26000f' };
const CAT_IDLE = ['..k..........k..', '.kkk........kkk.', 'kkkk........kkkk', 'kkkkkkkkkkkkkkkk', 'kwwwwkkkkkkwwwwk', 'kwppwkkkkkkwppwk', 'kwppwkkkkkkwppwk', 'kcckkkknnkkkkcck', '.kkkkkkkkkkkkkk.', 'kkkkkkrrkrrkkkkk', 'kkkkkrrrrrrrkkkk', 'kkkkkrrrrrrrkkkk', '.kkkkkrrrrrkkkk.', '..kkkkkrrrkkkk..', '....kk..r.kk....', '................'];
const CAT_HAPPY = [...CAT_IDLE]; CAT_HAPPY[4] = 'kkkkkkkkkkkkkkkk'; CAT_HAPPY[5] = 'kwkkwkkkkkkwkkwk'; CAT_HAPPY[6] = 'kkwwkkkkkkkkwwkk';
const CAT_BLINK = [...CAT_IDLE]; CAT_BLINK[4] = 'kkkkkkkkkkkkkkkk'; CAT_BLINK[5] = 'kwwwwkkkkkkwwwwk'; CAT_BLINK[6] = 'kkkkkkkkkkkkkkkk';
const CUPID = ['................', '.....hhhhhh.....', '....hhhhhhhh....', '.ww.hssssssh.ww.', 'wwww.sksssks.www', '.www.ssssss..ww.', '..w...ssrrss..w.', '.....ssssss.....', '....ssssssss....', '...ssssssssss...', '..sspppppppppss.', '...spppppppps...', '....ss....ss....', '....ss....ss....', '...sss....sss...', '................'];
function cupidFlap(rows) { // second frame: wings down by one row
  const g = rows.map((r) => r.split('')); const out = rows.map((r) => r.replaceAll('w', '.').split(''));
  for (let y = 0; y < 15; y++) for (let x = 0; x < 16; x++) if (g[y][x] === 'w') out[y + 1][x] = 'w';
  return out.map((r) => r.join(''));
}
function drawSprite(cv, rows) {
  const h = rows.length, w = rows[0].length; cv.width = w; cv.height = h; const g = cv.getContext('2d'); g.clearRect(0, 0, w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const c = PAL[rows[y][x]]; if (c) { g.fillStyle = c; g.fillRect(x, y, 1, 1); } }
}
const CONF = ['#ff3f78', '#ff9eb8', '#ffd4df', '#ffd58a', '#c8123c', '#fff8fa'];
const rand = (a, b) => a + Math.random() * (b - a), pick = (a) => a[(Math.random() * a.length) | 0], clamp01 = (v) => Math.max(0, Math.min(1, v));

export function createProposal(ctx) {
  const root = ctx.el, $ = (id) => root.querySelector('#' + id);
  const aimStage = $('aimStage'), target = $('target'), targetEnv = target.querySelector('.envelope'), arrow = $('arrow'), bow = $('bow'), nockEl = $('nock'),
    hintText = $('hintText'), win = $('window'), content = $('content'), title = $('title'), lines = $('letterLines'), catCanvas = $('cat'), cupid = $('cupid'),
    buttons = $('buttons'), yesBtn = $('yesBtn'), noBtn = $('noBtn'), finalText = $('final'), confettiBox = $('confetti'), rainBox = $('rain');
  const L = C.letter;
  $('envLabel').textContent = L.envelopeLabel; yesBtn.textContent = t(L.yesLabel); noBtn.textContent = t(L.noLabel);
  const ambient = new Ambient($('proposalAmbient'), { count: MOBILE ? 26 : 55, shapes: ['dot', 'heart', 'spark'], alpha: .7 });

  const MIN_DRAW = 6, MAX_DRAW = 34, DRAW_TIME = 380, FLEX = .12, BASE = 8.5, MAXS = 17, GRAV = .03, RECOIL = 220, HIT = 22, ARROW_LEN = 56;
  let angle = -Math.PI / 2, aiming = false, flying = false, missCount = 0, drawn = 0, rafId = 0, drawRAF = 0, drawT = 0, active = false, done = false, timers = [], parallax = [];
  let flapT = 0, blinkT = 0, catState = 'idle', yesScale = 1, confettiRAF = 0, confettiTimer = 0; const confetti = [];
  const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.push(id); return id; };

  function metrics() {
    const s = aimStage.getBoundingClientRect(), n = nockEl.getBoundingClientRect(), e = targetEnv.getBoundingClientRect();
    return { w: s.width, h: s.height, left: s.left, top: s.top, nx: n.left + n.width / 2 - s.left, ny: n.top + n.height / 2 - s.top, tx: e.left + e.width / 2 - s.left, ty: e.top + e.height / 2 - s.top, thw: e.width / 2, thh: e.height / 2 };
  }
  function clampAngle(a) { let d = a * 180 / Math.PI; if (d >= 0) d = d <= 90 ? -10 : -170; else { if (d > -10) d = -10; if (d < -170) d = -170; } return d * Math.PI / 180; }
  const restAngle = (m) => clampAngle(Math.atan2(m.ty - m.ny, m.tx - m.nx));
  const renderBow = (deg, flex) => { bow.style.transform = `rotate(${deg}deg) scaleX(${flex})`; };
  function renderAim(m) {
    const deg = angle * 180 / Math.PI; renderBow(deg, 1 + (drawn / MAX_DRAW) * FLEX);
    arrow.style.transform = `translate(${m.nx - Math.cos(angle) * drawn}px, ${m.ny - Math.sin(angle) * drawn}px) rotate(${deg}deg)`; arrow.classList.add('is-on');
  }
  function updateAim(x, y) { if (flying || done) return; const m = metrics(); angle = clampAngle(Math.atan2(y - m.top - m.ny, x - m.left - m.nx)); if (!aiming) drawn = 0; renderAim(m); }
  function startDraw() { if (REDUCED) { drawn = MAX_DRAW; renderAim(metrics()); return; } drawT = performance.now(); if (!drawRAF) drawRAF = requestAnimationFrame(drawStep); }
  function drawStep(now) {
    drawRAF = 0; if (!aiming || flying) return;
    const k = Math.min(1, (now - drawT) / DRAW_TIME), e = 1 - Math.pow(1 - k, 2.2); drawn = MIN_DRAW + (MAX_DRAW - MIN_DRAW) * e; if (k > .8) drawn += Math.sin(now / 38) * .7;
    renderAim(metrics()); drawRAF = requestAnimationFrame(drawStep);
  }
  function release() { if (!aiming || flying) return; aiming = false; cancelAnimationFrame(drawRAF); drawRAF = 0; fire(); }
  function fire() {
    if (flying) return; const power = clamp01((drawn - MIN_DRAW) / (MAX_DRAW - MIN_DRAW)); flying = true; aiming = false;
    const m = metrics(), launch = drawn, startFlex = 1 + (launch / MAX_DRAW) * FLEX; drawn = 0;
    if (REDUCED) { renderBow(angle * 180 / Math.PI, 1); onHit(m); return; }
    const sp = BASE + power * (MAXS - BASE); let vx = Math.cos(angle) * sp, vy = Math.sin(angle) * sp, tx = m.nx - Math.cos(angle) * launch, ty = m.ny - Math.sin(angle) * launch;
    const margin = HIT + missCount * 12, t0 = performance.now(); let frame = 0;
    (function step(now) {
      if (!active) return;
      const bt = Math.min(1, (now - t0) / RECOIL), flex = 1 + (startFlex - 1) * Math.cos(bt * Math.PI * 1.5) * (1 - bt); renderBow(angle * 180 / Math.PI, Math.max(.9, flex));
      vy += GRAV; tx += vx; ty += vy; const dir = Math.atan2(vy, vx), cos = Math.cos(dir), sin = Math.sin(dir);
      arrow.style.transform = `translate(${tx}px, ${ty}px) rotate(${dir * 180 / Math.PI}deg)`;
      const tipx = tx + cos * ARROW_LEN, tipy = ty + sin * ARROW_LEN;
      if ((frame++ & 1) === 0) spawnTrail(tx + cos * ARROW_LEN * .5, ty + sin * ARROW_LEN * .5);
      if (Math.abs(tipx - m.tx) <= m.thw + margin && Math.abs(tipy - m.ty) <= m.thh + margin) { onHit(m, dir); return; }
      if (tipx < -80 || tipx > m.w + 80 || tipy < -80 || tipy > m.h + 80) { onMiss(); return; }
      rafId = requestAnimationFrame(step);
    })(t0);
  }
  function spawnTrail(x, y) { const e = document.createElement('span'); e.className = 'heart trail'; e.style.left = x - 5.5 + 'px'; e.style.top = y - 5.5 + 'px'; e.style.background = '#ff9eb8'; e.addEventListener('animationend', () => e.remove()); aimStage.appendChild(e); }
  function onHit(m, dir) {
    cancelAnimationFrame(rafId); flying = false; drawn = 0; done = true; const a = dir == null ? angle : dir;
    arrow.style.transform = `translate(${m.tx - Math.cos(a) * ARROW_LEN}px, ${m.ty - Math.sin(a) * ARROW_LEN}px) rotate(${a * 180 / Math.PI}deg)`;
    target.classList.add('is-hit'); target.classList.remove('is-pulse');
    if (!REDUCED) { spawnBurst(aimStage, m.tx, m.ty, 22); const r = targetEnv.getBoundingClientRect(); trail.burst(r.left + r.width / 2, r.top + r.height / 2, 26); ambient.burst(r.left + r.width / 2, r.top + r.height / 2, 30); }
    later(openLetter, REDUCED ? 0 : 520);
  }
  function onMiss() {
    cancelAnimationFrame(rafId); flying = false; drawn = 0; arrow.classList.remove('is-on');
    hintText.textContent = L.missHints[Math.min(missCount, L.missHints.length - 1)]; missCount++; if (missCount >= 2) target.classList.add('is-pulse');
    later(() => { if (flying) return; const m = metrics(); angle = restAngle(m); renderAim(m); }, 320);
  }
  function spawnBurst(parent, cx, cy, n) {
    for (let i = 0; i < n; i++) {
      const h = document.createElement('span'); h.className = 'heart burst'; const s = 10 + Math.random() * 14; h.style.width = h.style.height = s + 'px';
      h.style.left = cx - s / 2 + 'px'; h.style.top = cy - s / 2 + 'px'; h.style.background = pick(CONF); const a = rand(0, 6.28), d = 60 + Math.random() * 110;
      h.style.setProperty('--bx', Math.cos(a) * d + 'px'); h.style.setProperty('--by', Math.sin(a) * d - 40 + 'px'); h.style.animationDelay = (Math.random() * .15).toFixed(2) + 's';
      h.addEventListener('animationend', () => h.remove()); parent.appendChild(h);
    }
  }

  /* ---- letter window ---- */
  function openLetter() {
    aimStage.classList.add('is-gone'); win.classList.add('is-open'); win.setAttribute('aria-hidden', 'false');
    title.textContent = t(L.greeting); lines.replaceChildren();
    L.paragraphs.forEach((p) => { const e = document.createElement('p'); e.textContent = t(p); lines.appendChild(e); });
    const ps = [...lines.children], base = REDUCED ? 0 : .9;
    gsap.to(ps, { opacity: 1, y: 0, duration: REDUCED ? .01 : .9, stagger: REDUCED ? 0 : 1.1, delay: base, ease: 'power2.out' });
    const total = base + (REDUCED ? 0 : ps.length * 1.1 + .6);
    later(() => { buttons.hidden = false; gsap.fromTo(buttons, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: .6 }); content.scrollTo({ top: content.scrollHeight, behavior: 'smooth' }); yesBtn.focus({ preventScroll: true }); ctx.unlock(); }, total * 1000);
  }
  function dodge(e) {
    if (e) e.preventDefault(); const area = content.getBoundingClientRect(), b = noBtn.getBoundingClientRect(), pad = 10;
    if (getComputedStyle(noBtn).position !== 'absolute') { noBtn.style.position = 'absolute'; noBtn.style.left = b.left - area.left + content.scrollLeft + 'px'; noBtn.style.top = b.top - area.top + content.scrollTop + 'px'; }
    const y = yesBtn.getBoundingClientRect(), m = 16, yL = y.left - area.left - m, yR = y.right - area.left + m, yT = y.top - area.top - m, yB = y.bottom - area.top + m;
    const minY = Math.max(area.height * .45, 0), maxX = Math.max(pad, area.width - b.width - pad), maxY = Math.max(minY + pad, area.height - b.height - pad); let nx = pad, ny = minY;
    for (let i = 0; i < 24; i++) { nx = pad + Math.random() * (maxX - pad); ny = minY + Math.random() * (maxY - minY); if (!(nx < yR && nx + b.width > yL && ny < yB && ny + b.height > yT)) break; }
    noBtn.style.left = nx + 'px'; noBtn.style.top = ny + 'px'; yesScale = Math.min(1.35, yesScale + .05); yesBtn.style.transform = `scale(${yesScale})`; yesBtn.classList.add('is-tempting');
  }
  function sayYes() {
    catState = 'happy'; title.textContent = t(L.happy); drawSprite(catCanvas, CAT_HAPPY); lines.style.display = 'none'; buttons.hidden = true; finalText.hidden = true;
    content.classList.add('is-won'); win.classList.add('is-celebrate');
    if (!REDUCED) { const r = catCanvas.getBoundingClientRect(); trail.burst(r.left + r.width / 2, r.top + r.height / 2, 30); celebrate(); }
    ctx.unlock(); later(() => ctx.next(), REDUCED ? 600 : 2600);
  }
  function addConfetti(x, y, vx, vy, size) { const e = document.createElement('span'); e.className = 'heart confetti-heart'; e.style.width = e.style.height = size.toFixed(0) + 'px'; e.style.background = pick(CONF); rainBox.appendChild(e); confetti.push({ e, x, y, vx, vy, rot: rand(0, 360), vr: rand(-7, 7), age: 0, life: rand(2.6, 3.6) }); }
  function popper(x, y, ang, n, sc) { for (let i = 0; i < n; i++) { const a = ang + rand(-.42, .42), s = rand(14, 21) * sc; addConfetti(x, y, Math.cos(a) * s, Math.sin(a) * s, rand(36, 78) * sc); } }
  function confettiTick() {
    confettiRAF = 0; const H = innerHeight;
    for (let i = confetti.length - 1; i >= 0; i--) { const p = confetti[i]; p.vy += .2; p.vx *= .993; p.vy *= .993; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.age += 1 / 60; const o = p.age < .1 ? p.age / .1 : Math.max(0, 1 - (p.age - .1) / p.life);
      p.e.style.opacity = o.toFixed(2); p.e.style.transform = `translate3d(${p.x}px, ${p.y}px, 0) rotate(${p.rot | 0}deg)`; if (o <= 0 || p.y > H + 120) { p.e.remove(); confetti.splice(i, 1); } }
    if (confetti.length && active) confettiRAF = requestAnimationFrame(confettiTick);
  }
  function celebrate() {
    const sc = Math.max(.5, Math.min(1.1, Math.min(innerWidth, innerHeight) / 900)), W = innerWidth, H = innerHeight;
    const shot = () => { popper(-14, H + 14, -Math.PI * .34, 5, sc); popper(W + 14, H + 14, -Math.PI * .66, 5, sc); popper(W / 2, H + 14, -Math.PI * .5, 5, sc); };
    shot(); let k = 0; confettiTimer = setInterval(() => { shot(); if ((k += 360) >= 2700) clearInterval(confettiTimer); }, 360); if (!confettiRAF) confettiRAF = requestAnimationFrame(confettiTick);
  }

  /* ---- background confetti parallax (from original) ---- */
  function spawnBgHearts() {
    confettiBox.replaceChildren(); parallax = []; const scale = REDUCED ? .4 : MOBILE ? .5 : 1;
    [{ n: 22, f: 7, a: 5, b: 9, bl: 1.6, op: .5 }, { n: 24, f: 16, a: 7, b: 13, bl: 0, op: .9 }, { n: 18, f: 30, a: 10, b: 18, bl: 0, op: 1 }].forEach((Lr) => {
      const layer = document.createElement('div'); layer.className = 'confetti__layer'; if (Lr.bl) layer.style.filter = `blur(${Lr.bl}px)`; layer.style.opacity = Lr.op;
      for (let i = 0; i < Math.round(Lr.n * scale); i++) { const h = document.createElement('span'); h.className = 'heart'; const s = Lr.a + Math.random() * (Lr.b - Lr.a);
        h.style.width = h.style.height = s + 'px'; h.style.left = Math.random() * 100 + 'vw'; h.style.top = Math.random() * 100 + 'vh'; h.style.background = pick(CONF); h.style.animationDuration = (3 + Math.random() * 5).toFixed(2) + 's'; h.style.animationDelay = (-Math.random() * 6).toFixed(2) + 's'; layer.appendChild(h); }
      confettiBox.appendChild(layer); parallax.push({ el: layer, f: Lr.f });
    });
  }
  let pX = 0, pY = 0, pRAF = 0;
  function applyParallax() { pRAF = 0; parallax.forEach(({ el, f }) => { el.style.transform = `translate(${-pX * f}px, ${-pY * f}px)`; }); target.style.transform = `translateX(-50%) translate(${pX * 12}px, ${pY * 9}px)`; }
  const onParallax = (e) => { pX = (e.clientX / innerWidth - .5) * 2; pY = (e.clientY / innerHeight - .5) * 2; if (!pRAF) pRAF = requestAnimationFrame(applyParallax); };

  /* ---- pointer wiring ---- */
  const onMove = (e) => { if (active && !flying && !done) updateAim(e.clientX, e.clientY); };
  const onDown = (e) => { if (flying || done) return; const m = metrics(); angle = clampAngle(Math.atan2(e.clientY - m.top - m.ny, e.clientX - m.left - m.nx)); aiming = true; startDraw(); };
  aimStage.addEventListener('pointermove', onMove); aimStage.addEventListener('pointerdown', onDown); addEventListener('pointerup', () => { if (active) release(); });
  aimStage.addEventListener('keydown', (e) => {
    if (e.key !== ' ' && e.key !== 'Enter') return; e.preventDefault(); if (flying || aiming || done) return;
    const m = metrics(); angle = restAngle(m); aiming = true; startDraw(); later(release, REDUCED ? 0 : DRAW_TIME + 60);
  });
  ['pointerenter', 'pointerdown', 'click', 'focus'].forEach((ev) => noBtn.addEventListener(ev, dodge));
  yesBtn.addEventListener('click', sayYes);
  addEventListener('resize', () => { if (active && !flying && !done) { const m = metrics(); angle = restAngle(m); renderAim(m); } });
  drawSprite(catCanvas, CAT_IDLE);

  function reset() {
    cancelAnimationFrame(rafId); cancelAnimationFrame(drawRAF); drawRAF = 0; clearInterval(confettiTimer); timers.forEach(clearTimeout); timers = [];
    flying = aiming = done = false; missCount = 0; drawn = 0; catState = 'idle'; yesScale = 1;
    win.classList.remove('is-open', 'is-celebrate'); win.setAttribute('aria-hidden', 'true'); aimStage.classList.remove('is-gone'); target.classList.remove('is-hit', 'is-pulse');
    title.textContent = ''; lines.replaceChildren(); lines.style.display = ''; buttons.hidden = true; finalText.hidden = true; content.classList.remove('is-won');
    noBtn.style.position = noBtn.style.left = noBtn.style.top = ''; yesBtn.style.transform = ''; yesBtn.classList.remove('is-tempting');
    confetti.splice(0).forEach((c) => c.e.remove()); rainBox.replaceChildren(); aimStage.querySelectorAll('.trail,.burst').forEach((n) => n.remove());
    hintText.textContent = L.hint; drawSprite(catCanvas, CAT_IDLE);
  }
  return {
    enter() {
      active = true; reset(); spawnBgHearts(); ambient.start(); trail.setBase('dark');
      const frames = [CUPID, cupidFlap(CUPID)]; let f = 0; drawSprite(cupid, frames[0]);
      if (!REDUCED) { flapT = setInterval(() => drawSprite(cupid, frames[(f ^= 1)]), 420); blinkT = setInterval(() => { if (catState !== 'idle') return; drawSprite(catCanvas, CAT_BLINK); setTimeout(() => catState === 'idle' && drawSprite(catCanvas, CAT_IDLE), 140); }, 3600); addEventListener('pointermove', onParallax, { passive: true }); }
      const lay = () => { if (!flying && active) { const m = metrics(); angle = restAngle(m); renderAim(m); } };
      requestAnimationFrame(lay); setTimeout(lay, 600); document.fonts?.ready.then(lay);
      later(() => aimStage.focus({ preventScroll: true }), 1800);
    },
    exit() { active = false; ambient.stop(); clearInterval(flapT); clearInterval(blinkT); removeEventListener('pointermove', onParallax); cancelAnimationFrame(confettiRAF); confettiRAF = 0; clearInterval(confettiTimer); timers.forEach(clearTimeout); timers = []; }
  };
}
