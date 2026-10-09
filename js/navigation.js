/* Chapter controller: one continuous story. Handles transitions (heart iris, bloom, zoom-through,
   blur-fade), gating (a chapter must be "unlocked" before moving on), wheel / keys / swipe input,
   the chapter indicator and the Skip/Continue button. */
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (id) => document.getElementById(id);

export function createNavigation(chapters, hooks = {}) {
  const veil = $('veil'), bloom = veil.querySelector('.veil__bloom'), navEl = $('chapterNav'), skip = $('skipBtn');
  let cur = -1, busy = false, max = 0, enabled = false, lastNav = 0, wheelAcc = 0;
  const unlocked = chapters.map(() => false);
  const btns = [];

  chapters.forEach((c, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = '♥'; b.setAttribute('aria-label', `Chapter ${i + 1}`);
    b.addEventListener('click', () => { if (i <= max) go(i, { force: true }); });
    navEl.appendChild(b); btns.push(b);
    if (i < chapters.length - 1) navEl.appendChild(document.createElement('i'));
  });
  function paint() {
    btns.forEach((b, i) => { b.classList.toggle('is-current', i === cur); b.classList.toggle('is-visited', i <= max); b.disabled = i > max; });
    const last = cur === chapters.length - 1;
    skip.classList.toggle('is-on', enabled && !last);
    const ready = unlocked[cur]; skip.classList.toggle('is-ready', !!ready); skip.textContent = ready ? 'Continue ♡' : 'Skip →';
  }
  const iris = (el, v) => { const s = `${v}px ${v}px`; el.style.webkitMaskSize = s; el.style.maskSize = s; };
  const irisOn = (el) => { el.classList.add('heart-iris'); el.style.webkitMaskPosition = el.style.maskPosition = 'center'; el.style.webkitMaskRepeat = el.style.maskRepeat = 'no-repeat'; iris(el, 0); };
  const irisOff = (el) => { el.classList.remove('heart-iris'); el.style.webkitMaskSize = el.style.maskSize = ''; };
  const clear = (el) => { gsap.set(el, { clearProps: 'opacity,transform,filter,zIndex' }); };

  async function go(i, { force = false } = {}) {
    if (busy || i === cur || i < 0 || i >= chapters.length) return;
    const dir = i > cur ? 1 : -1;
    if (cur >= 0 && dir > 0 && !force && !unlocked[cur]) { gsap.fromTo(skip, { x: -4 }, { x: 0, duration: .5, ease: 'elastic.out(1,.3)' }); return; }
    busy = true; lastNav = performance.now();
    const from = cur >= 0 ? chapters[cur] : null, to = chapters[i];
    const A = from && from.el, B = to.el; let kind = REDUCED ? 'fade' : (dir < 0 ? 'fade' : to.transition || 'fade');
    if (from === null) kind = 'first';
    hooks.beforeEnter && hooks.beforeEnter(i, from ? cur : -1);
    to.mod.enter && to.mod.enter();
    B.classList.add('is-incoming'); gsap.set(B, { zIndex: 2 }); if (A) gsap.set(A, { zIndex: 1 });
    const done = () => {
      if (A) { A.classList.remove('is-outgoing', 'is-active'); clear(A); from.mod.exit && from.mod.exit(); }
      B.classList.remove('is-incoming'); B.classList.add('is-active'); clear(B); irisOff(B);
      gsap.set(veil, { opacity: 0 }); cur = i; max = Math.max(max, i); busy = false; paint();
      hooks.afterEnter && hooks.afterEnter(i);
    };
    if (A) A.classList.add('is-outgoing');
    const tl = gsap.timeline({ onComplete: done });
    if (kind === 'first') {
      gsap.set(B, { opacity: 0 });
      tl.to(B, { opacity: 1, duration: 2, ease: 'power2.out' });
    } else if (kind === 'iris') {
      irisOn(B); gsap.set(B, { opacity: 1 }); const o = { v: 0 }, big = Math.max(innerWidth, innerHeight) * 3.4;
      gsap.set(veil, { opacity: 0 }); gsap.set(bloom, { scale: .2 });
      tl.to(A, { scale: 1.08, duration: 1.9, ease: 'power2.in' }, 0)
        .to(o, { v: big, duration: 1.9, ease: 'power3.in', onUpdate: () => iris(B, o.v) }, 0)
        .to(veil, { opacity: .55, duration: .9, yoyo: true, repeat: 1, ease: 'sine.inOut' }, .5)
        .to(bloom, { scale: 1.6, duration: 1.8, ease: 'power2.out' }, .3);
    } else if (kind === 'bloom') {
      gsap.set(B, { opacity: 0 }); gsap.set(bloom, { scale: .15 });
      tl.to(veil, { opacity: 1, duration: .5, ease: 'sine.in' }, 0).to(bloom, { scale: 2.6, duration: 1.3, ease: 'power2.in' }, 0)
        .to(A, { opacity: 0, filter: 'blur(14px)', duration: 1, ease: 'power2.in' }, .2)
        .set(B, { opacity: 1 }, 1.15)
        .to(veil, { opacity: 0, duration: 1.1, ease: 'sine.out' }, 1.2).to(bloom, { scale: 3.4, duration: 1.2, ease: 'power1.out' }, 1.2);
    } else if (kind === 'zoom') {
      gsap.set(B, { opacity: 0, scale: .8, filter: 'blur(12px)' });
      tl.to(A, { scale: 1.7, opacity: 0, filter: 'blur(10px)', duration: 1.5, ease: 'power3.in' }, 0)
        .to(B, { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 1.7, ease: 'power2.out' }, .5);
    } else { // fade / blur
      gsap.set(B, { opacity: 0, filter: 'blur(12px)' });
      tl.to(A, { opacity: 0, filter: 'blur(10px)', duration: REDUCED ? .3 : 1.1 }, 0)
        .to(B, { opacity: 1, filter: 'blur(0px)', duration: REDUCED ? .3 : 1.3, ease: 'power2.out' }, REDUCED ? 0 : .3);
    }
    cur = cur; // (cur updates in done())
    hooks.trailMode && hooks.trailMode(B.dataset.trailMode || 'dark');
  }

  // ---------- input ----------
  const next = () => go(cur + 1), prev = () => go(cur - 1);
  addEventListener('keydown', (e) => {
    if (!enabled || busy) return;
    if (['ArrowRight', 'ArrowDown', 'PageDown'].includes(e.key) && !e.target.closest?.('input')) { e.preventDefault(); next(); }
    else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key) && !e.target.closest?.('input')) { e.preventDefault(); prev(); }
  });
  addEventListener('wheel', (e) => {
    if (!enabled || busy || performance.now() - lastNav < 900) return; wheelAcc += e.deltaY;
    if (Math.abs(wheelAcc) > 70) { wheelAcc > 0 ? next() : prev(); wheelAcc = 0; }
  }, { passive: true });
  setInterval(() => { wheelAcc *= .5; }, 200);
  let ty = 0, tx = 0, tOK = false;
  addEventListener('touchstart', (e) => { const t = e.touches[0]; ty = t.clientY; tx = t.clientX; tOK = !e.target.closest('[data-noswipe],button,input,.window'); }, { passive: true });
  addEventListener('touchend', (e) => {
    if (!enabled || busy || !tOK) return; const t = e.changedTouches[0], dy = ty - t.clientY, dx = tx - t.clientX;
    if (Math.abs(dy) > 70 && Math.abs(dy) > Math.abs(dx) * 1.3) dy > 0 ? next() : prev();
  }, { passive: true });
  skip.addEventListener('click', () => go(cur + 1, { force: true }));

  return {
    go, get current() { return cur; },
    start(i = 0) { enabled = true; return go(i, { force: true }); },
    unlock(i = cur) { unlocked[i] = true; if (i === cur) paint(); },
    lockAll() { unlocked.fill(false); },
    showChrome() { navEl.classList.add('is-on'); enabled = true; paint(); }
  };
}
