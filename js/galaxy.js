/* CHAPTER 3 — THE GALAXY
   Built on the "Interactive Dreamwave Galaxy" project: Three.js, a shader nebula sphere, a huge
   twinkling shader star field (65k desktop / 40k laptop / 14k mobile), mouse-reactive universe,
   orbit controls. Recoloured to pink/rose/white/gold/crimson and extended with floating photo
   "memory planets", a star cluster that gathers into the message, hover glow + captions.
   The renderer is created on enter and fully disposed on exit (no hidden CPU/GPU use).      */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { birthdayConfig as C, t } from './config.js';
import { memories, framedCard } from './photos.js';
import { trail } from './cursorTrail.js';

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const COARSE = matchMedia('(pointer: coarse)').matches;
const isMobile = () => innerWidth <= 720 || COARSE;
const tier = () => (isMobile() ? { stars: 14000, photos: 6, dpr: 1.5 } : innerWidth >= 1200 && (navigator.hardwareConcurrency || 8) > 4 ? { stars: 65000, photos: 9, dpr: 2 } : { stars: 40000, photos: 8, dpr: 1.75 });
const rand = (a, b) => a + Math.random() * (b - a);
const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;

const NEBULA_V = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
const NEBULA_F = `uniform float uTime; varying vec2 vUv;
float hash(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
float noise(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y); }
float fbm(vec2 p){ float v=0.,a=.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.; a*=.5; } return v; }
void main(){ vec2 uv=vUv*2.; float t=uTime*.02; float eq=smoothstep(.4,0.,abs(vUv.y-.5));
  float n1=fbm(uv*3.+vec2(t,t)); float n2=fbm(uv*5.-vec2(t*1.2,t*.8)+n1);
  vec3 base=vec3(.008,0.,.012), c1=vec3(.16,.01,.09), c2=vec3(.11,.005,.08), band=vec3(.09,.04,.05);
  vec3 col=base+c1*n1*(.4+.6*eq)+c2*n2*(.4+.4*eq)+band*eq*(n1*n2)*2.; gl_FragColor=vec4(col,1.); }`;
const STAR_V = `uniform float uTime,uPixelRatio,uBoost; attribute float size,phase,twinkleSpeed; attribute vec3 customColor; varying vec3 vColor; varying float vTwinkle;
void main(){ vColor=customColor; float t=uTime*twinkleSpeed+phase; float wave=sin(t)*.5+.5; float flash=pow(wave,10.)*2.5; float basePulse=.15+wave*.3; vTwinkle=(basePulse+flash)*(1.+uBoost*.7);
  vec4 mv=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*mv; gl_PointSize=size*uPixelRatio*(600./length(mv.xyz))*vTwinkle; }`;
const STAR_F = `varying vec3 vColor; varying float vTwinkle;
void main(){ vec2 uv=gl_PointCoord.xy*2.-1.; float d=length(uv); float rayX=exp(-abs(uv.x)*30.)*exp(-abs(uv.y)*1.); float rayY=exp(-abs(uv.y)*30.)*exp(-abs(uv.x)*1.);
  float core=exp(-d*15.); float halo=exp(-d*4.)*.5; float alpha=(rayX+rayY)*.8+core+halo; alpha*=smoothstep(1.,.1,d); if(alpha<.02) discard;
  vec3 c=mix(vColor,vec3(1.),core*.9); gl_FragColor=vec4(c,alpha*min(vTwinkle,2.5)*.8); }`;
const GATHER_V = `uniform float uTime,uGather,uPixelRatio; attribute vec3 target; attribute float size,phase; varying float vA;
void main(){ float g=smoothstep(0.,1.,clamp(uGather*1.25-phase*.25,0.,1.)); vec3 wob=vec3(sin(uTime*.6+phase*6.28),cos(uTime*.5+phase*6.28),sin(uTime*.4+phase*3.))*.9;
  vec3 p=mix(position,target+wob,g); vec4 mv=modelViewMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv; float tw=.65+.35*sin(uTime*2.+phase*20.);
  gl_PointSize=size*uPixelRatio*(520./-mv.z)*tw*(.45+g*.9); vA=(.12+g*.88)*tw; }`;
const GATHER_F = `varying float vA; void main(){ vec2 uv=gl_PointCoord*2.-1.; float d=length(uv); float a=(exp(-d*5.)+exp(-d*14.)*.8)*smoothstep(1.,.2,d);
  gl_FragColor=vec4(mix(vec3(1.,.42,.6),vec3(1.),exp(-d*9.)),a*vA); }`;

function glowTexture(rgb = '255,63,120') {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, `rgba(255,255,255,.9)`); gr.addColorStop(.2, `rgba(${rgb},.65)`); gr.addColorStop(.55, `rgba(${rgb},.18)`); gr.addColorStop(1, `rgba(${rgb},0)`); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

export function createGalaxy(ctx) {
  const root = ctx.el, host = root.querySelector('#gxCanvas'), titleEl = root.querySelector('#gxTitle'), subEl = root.querySelector('#gxSub'), tip = root.querySelector('#gxTip'), loading = root.querySelector('#gxLoading');
  let S = null, tl = null, pullTimer = 0, unlockTimer = 0, gen = 0;

  async function build() {
    const T = tier(), W = host.clientWidth || innerWidth, H = host.clientHeight || innerHeight;
    const scene = new THREE.Scene(), universe = new THREE.Group(); scene.add(universe);
    const camera = new THREE.PerspectiveCamera(60, W / H, .1, 2000); camera.position.set(0, 0, 420);
    const renderer = new THREE.WebGLRenderer({ antialias: !isMobile(), alpha: false, powerPreference: 'high-performance' });
    const dpr = Math.min(devicePixelRatio || 1, T.dpr); renderer.setPixelRatio(dpr); renderer.setSize(W, H); host.appendChild(renderer.domElement);
    const disposables = [];
    // nebula
    const bgMat = new THREE.ShaderMaterial({ vertexShader: NEBULA_V, fragmentShader: NEBULA_F, uniforms: { uTime: { value: 0 } }, side: THREE.BackSide, depthWrite: false });
    const bgGeo = new THREE.SphereGeometry(1000, 32, 32); universe.add(new THREE.Mesh(bgGeo, bgMat)); disposables.push(bgMat, bgGeo);
    // stars
    const n = T.stars, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), size = new Float32Array(n), phase = new Float32Array(n), tw = new Float32Array(n);
    const pal = ['#ff3f78', '#ff9eb8', '#ff9eb8', '#fff8fa', '#fff8fa', '#fff8fa', '#ffd58a', '#c8123c', '#ff5fa0', '#d58bff'].map((c) => new THREE.Color(c)), white = new THREE.Color(0xffffff);
    for (let i = 0; i < n; i++) {
      const r = 800 * Math.cbrt(Math.random()), th = Math.random() * 6.2832, ph = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th); pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th); pos[i * 3 + 2] = r * Math.cos(ph);
      const c = pal[(Math.random() * pal.length) | 0].clone().lerp(white, Math.random() * .25); col.set([c.r, c.g, c.b], i * 3);
      size[i] = Math.pow(Math.random(), 7) * 20 + 1; phase[i] = Math.random() * 6.2832; tw[i] = Math.random() * 4 + .5;
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); sg.setAttribute('customColor', new THREE.BufferAttribute(col, 3)); sg.setAttribute('size', new THREE.BufferAttribute(size, 1));
    sg.setAttribute('phase', new THREE.BufferAttribute(phase, 1)); sg.setAttribute('twinkleSpeed', new THREE.BufferAttribute(tw, 1));
    const starMat = new THREE.ShaderMaterial({ vertexShader: STAR_V, fragmentShader: STAR_F, uniforms: { uTime: { value: 0 }, uPixelRatio: { value: dpr }, uBoost: { value: 0 } }, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    universe.add(new THREE.Points(sg, starMat)); disposables.push(sg, starMat);
    // gathering cluster (the "discovered" message region)
    const gn = isMobile() ? 1400 : 3200, gp = new Float32Array(gn * 3), gt = new Float32Array(gn * 3), gs = new Float32Array(gn), gph = new Float32Array(gn);
    for (let i = 0; i < gn; i++) {
      const r = rand(120, 380), th = rand(0, 6.28), ph = Math.acos(rand(-1, 1)); gp.set([r * Math.sin(ph) * Math.cos(th), r * Math.sin(ph) * Math.sin(th), r * Math.cos(ph)], i * 3);
      gt.set([gauss() * 30, gauss() * 9, gauss() * 8], i * 3); gs[i] = rand(2, 7); gph[i] = Math.random();
    }
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.BufferAttribute(gp, 3)); gg.setAttribute('target', new THREE.BufferAttribute(gt, 3)); gg.setAttribute('size', new THREE.BufferAttribute(gs, 1)); gg.setAttribute('phase', new THREE.BufferAttribute(gph, 1));
    const gMat = new THREE.ShaderMaterial({ vertexShader: GATHER_V, fragmentShader: GATHER_F, uniforms: { uTime: { value: 0 }, uGather: { value: 0 }, uPixelRatio: { value: dpr } }, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    const gather = new THREE.Points(gg, gMat); gather.frustumCulled = false; universe.add(gather); disposables.push(gg, gMat);
    const gtex = glowTexture(), glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: gtex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 }));
    glow.scale.set(95, 40, 1); universe.add(glow); disposables.push(gtex, glow.material);
    // photos
    const photoGroup = new THREE.Group(); universe.add(photoGroup);
    const items = [], starTex = glowTexture('255,212,223'); disposables.push(starTex);
    const count = Math.min(T.photos, memories.length), baseW = isMobile() ? 10 : 12.5;
    for (let i = 0; i < count; i++) {
      const { canvas, aspect } = await framedCard(i), tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
      const w = baseW * rand(.8, 1.3), h = w / aspect, mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0 });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); mesh.userData.i = i;
      const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 })); gl.scale.set(w * 2, h * 1.9, 1); gl.position.z = -.2;
      const ring = new Float32Array(18 * 3); for (let k = 0; k < 18; k++) { const a = k / 18 * 6.28 + rand(-.2, .2), rr = rand(.62, .95); ring.set([Math.cos(a) * w * rr, Math.sin(a) * h * rr, rand(-1, 1)], k * 3); }
      const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(ring, 3));
      const rm = new THREE.PointsMaterial({ size: 1.8, map: starTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffd4df, opacity: 0 });
      const pts = new THREE.Points(rg, rm), holder = new THREE.Group(); holder.add(gl, mesh, pts); photoGroup.add(holder);
      disposables.push(tex, mat, mesh.geometry, gl.material, rg, rm);
      const side = i % 2 ? 1 : -1, orbitR = rand(isMobile() ? 34 : 44, isMobile() ? 56 : 78);
      items.push({ holder, mesh, gl, pts, mat, rm, w, h, i, theta: (i / count) * 6.283 + rand(-.3, .3), r: orbitR, y: side * rand(isMobile() ? 16 : 14, isMobile() ? 34 : 32), omega: rand(.035, .085) * (i % 3 ? 1 : -1), bob: rand(0, 6.28), hover: 0, hoverT: 0, pull: 0, tilt: rand(-.18, .18), appear: 0 });
    }
    // controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = .05; controls.enablePan = false; controls.enableZoom = false; controls.autoRotate = !REDUCED; controls.autoRotateSpeed = .4;
    controls.rotateSpeed = isMobile() ? .55 : .8; controls.minPolarAngle = Math.PI * .3; controls.maxPolarAngle = Math.PI * .7;
    S = { scene, universe, camera, renderer, controls, starMat, gMat, bgMat, glow, items, disposables, photoGroup, dist: 420, mouseX: 0, mouseY: 0, raf: 0, clock: new THREE.Clock(), ray: new THREE.Raycaster(), ndc: new THREE.Vector2(), hovered: null, boost: 0, lastTip: -1 };
    const el = renderer.domElement;
    S.onMove = (e) => {
      const r = el.getBoundingClientRect(); S.mouseX = ((e.clientX - r.left) / r.width) * 2 - 1; S.mouseY = -((e.clientY - r.top) / r.height) * 2 + 1; S.ndc.set(S.mouseX, S.mouseY); S.px = e.clientX; S.py = e.clientY; S.pt = e.pointerType;
    };
    S.onDown = (e) => { S.onMove(e); if (e.pointerType === 'touch') { pick(); S.touchHold = true; } };
    el.addEventListener('pointermove', S.onMove); el.addEventListener('pointerdown', S.onDown);
    S.onResize = () => { const w = host.clientWidth, h = host.clientHeight; if (!w) return; camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h); };
    addEventListener('resize', S.onResize);
  }

  function pick() {
    if (!S) return; S.ray.setFromCamera(S.ndc, S.camera);
    const hit = S.ray.intersectObjects(S.items.map((i) => i.mesh), false)[0]; S.hovered = hit ? S.items.find((i) => i.mesh === hit.object) : null;
  }
  const v = new (THREE.Vector3)(), cp = new (THREE.Vector3)();
  function loop() {
    if (!S) return; S.raf = requestAnimationFrame(loop);
    const time = S.clock.getElapsedTime(), dt = Math.min(.05, S.clock.getDelta() || .016);
    S.starMat.uniforms.uTime.value = time; S.bgMat.uniforms.uTime.value = time; S.gMat.uniforms.uTime.value = time;
    S.universe.rotation.x += (S.mouseY * .08 - S.universe.rotation.x) * .05; S.universe.rotation.y += (S.mouseX * .08 - S.universe.rotation.y) * .05;
    S.controls.update(); S.camera.position.setLength(S.dist);
    if (S.pt !== 'touch' || S.touchHold) pick();
    if (S.pt === 'touch' && !S.touchHold) S.hovered = S.hovered; // keep last tap selection
    let boost = 0, hoveredNow = null;
    for (const it of S.items) {
      it.theta += it.omega * .01 * (REDUCED ? 0 : 1) * 1; const th = it.theta;
      it.holder.position.set(Math.cos(th) * it.r, it.y + Math.sin(time * .5 + it.bob) * 2.2, Math.sin(th) * it.r * .72);
      if (it.pull > 0) { cp.copy(S.camera.position).sub(it.holder.position).normalize().multiplyScalar(it.pull * 48); it.holder.position.add(cp); }
      it.holder.quaternion.copy(S.camera.quaternion); it.holder.rotateZ(it.tilt + Math.sin(time * .4 + it.bob) * .05);
      const isH = S.hovered === it; if (isH) hoveredNow = it; it.hoverT += ((isH ? 1 : 0) - it.hoverT) * .12; boost = Math.max(boost, it.hoverT);
      const s = (.35 + .65 * it.appear) * (1 + it.hoverT * .2); it.holder.scale.setScalar(s);
      const a = it.appear; it.mat.opacity = a; it.gl.material.opacity = a * (.35 + it.hoverT * .65); it.rm.opacity = a; it.rm.size = 1.8 + it.hoverT * 2.2; it.mat.color.setScalar(1 + it.hoverT * .45);
    }
    S.boost += (boost - S.boost) * .1; S.starMat.uniforms.uBoost.value = S.boost; el_cursor(hoveredNow);
    S.renderer.render(S.scene, S.camera);
  }
  function el_cursor(it) {
    const el = S.renderer.domElement; el.style.cursor = it ? 'pointer' : '';
    if (it) {
      if (S.lastTip !== it.i) { tip.textContent = memories[it.i].caption || ''; S.lastTip = it.i; }
      v.copy(it.holder.position).project(S.camera); v.y -= 0; const r = host.getBoundingClientRect();
      const x = (v.x * .5 + .5) * r.width, y = (-v.y * .5 + .5) * r.height; const hh = it.h * (r.height / (2 * Math.tan(THREE.MathUtils.degToRad(30)) * S.camera.position.length())) * 1.1;
      tip.style.left = Math.max(80, Math.min(r.width - 80, x)) + 'px'; tip.style.top = Math.min(r.height - 60, y + hh * .5 + 10) + 'px'; tip.style.opacity = tip.textContent ? 1 : 0;
    } else { tip.style.opacity = 0; S.lastTip = -1; }
  }
  function destroy() {
    if (!S) return; cancelAnimationFrame(S.raf); const el = S.renderer.domElement; el.removeEventListener('pointermove', S.onMove); el.removeEventListener('pointerdown', S.onDown); removeEventListener('resize', S.onResize);
    S.controls.dispose(); S.disposables.forEach((d) => d.dispose && d.dispose()); S.items.forEach((i) => i.mesh.geometry.dispose()); S.renderer.dispose(); S.renderer.forceContextLoss(); el.remove(); S = null;
  }

  return {
    async enter() {
      trail.setBase('dark'); tl && tl.kill(); clearInterval(pullTimer); clearTimeout(unlockTimer);
      gsap.set([titleEl, subEl], { opacity: 0 }); gsap.set(titleEl, { letterSpacing: '.3em', y: 12 }); gsap.set(subEl, { y: 10 });
      titleEl.textContent = t(C.galaxy.title); subEl.textContent = t(C.galaxy.subtitle); loading.classList.remove('is-off');
      const my = ++gen; destroy(); await build(); if (my !== gen) { destroy(); return; } loading.classList.add('is-off'); if (!S) return; S.clock.start(); loop();
      tl = gsap.timeline();
      tl.to(S, { dist: 100, duration: REDUCED ? .1 : 3.4, ease: 'power3.out' }, 0)                                     // zoom through the stars
        .to(S.gMat.uniforms.uGather, { value: 1, duration: REDUCED ? .1 : 4, ease: 'power2.inOut' }, 1)                 // stars gather into the message
        .to(S.glow.material, { opacity: .4, duration: 3, ease: 'power2.out' }, 2.4)
        .to(titleEl, { opacity: 1, y: 0, letterSpacing: '.02em', duration: 2.4, ease: 'power3.out' }, 4.4)             // the text is discovered
        .to(subEl, { opacity: 1, y: 0, duration: 2, ease: 'power2.out' }, 6)
        .to(S.items.map((i) => i), { appear: 1, duration: 2.2, stagger: .45, ease: 'power2.out' }, 5.2);               // photos begin to orbit
      unlockTimer = setTimeout(() => ctx.unlock(), 9500);
      pullTimer = setInterval(() => { if (!S || !S.items.length) return; const it = S.items[(Math.random() * S.items.length) | 0]; if (it.appear < 1) return;
        gsap.timeline().to(it, { pull: .75, duration: 2.2, ease: 'sine.inOut' }).to(it, { pull: 0, duration: 2.6, ease: 'sine.inOut' }, '+=1.4'); }, 7000);
    },
    exit() { gen++; clearInterval(pullTimer); clearTimeout(unlockTimer); tl && tl.kill(); destroy(); tip.style.opacity = 0; }
  };
}
