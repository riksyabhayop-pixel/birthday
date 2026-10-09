/* CHAPTER 5 — THE CRYSTAL HEART
   From the "Animated Crystal Heart" project: Three.js, instanced particle quads driven by the
   original custom vertex shader (the mathematical heart curve 16sin³t / 13cos t − 5cos 2t …),
   a second shader for drifting heart-"snow", additive blending. The two CodePen-hosted assets
   (heart.png / heart.glb / matcap) are replaced by a generated glow-heart sprite and a
   procedural faceted crystal heart, so nothing external is required.
   New: photographs orbit the heart in 3D (front/behind), react to the cursor, and the heart
   reacts to the cursor (brightens, pulses, pushes photos outward).                      */
import * as THREE from 'three';
import { birthdayConfig as C, t } from './config.js';
import { memories, framedCard } from './photos.js';
import { trail } from './cursorTrail.js';

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const COARSE = matchMedia('(pointer: coarse)').matches;
const isMobile = () => innerWidth <= 720 || COARSE;
const rand = (a, b) => a + Math.random() * (b - a);

const HEART_V = `#define M_PI 3.1415926535897932384626433832795
uniform float uTime,uSize,uPulse,uGlow; uniform vec2 uMouse; attribute float aScale,random,random1,aSpeed; attribute vec3 aColor; varying vec3 vColor; varying vec2 vUv; varying float vGlow;
void main(){
  float sgn=2.*(step(random,.5)-.5); float t=sgn*mod(-uTime*aSpeed*.005+10.*aSpeed*aSpeed,M_PI); float a=pow(t,2.)*pow(t-sgn*M_PI,2.); float radius=.14;
  vec3 off=vec3(radius*16.*pow(sin(t),2.)*sin(t), radius*(13.*cos(t)-5.*cos(2.*t)-2.*cos(3.*t)-cos(4.*t)), .15*(a*(random1-.5))*sin(abs(10.*sin(.2*uTime+.2*random))*t));
  off*=1.+uPulse*.06*sin(uTime*6.+random*6.28);
  vec4 mp=modelMatrix*vec4(off,1.); float md=distance(mp.xy,uMouse); vGlow=uGlow*smoothstep(3.,0.,md);
  vec4 vp=viewMatrix*mp; vp.xyz+=position*aScale*uSize*pow(a,.5)*.5*(1.+vGlow*.8); gl_Position=projectionMatrix*vp; vColor=aColor; vUv=uv; }`;
const HEART_F = `uniform sampler2D uTex; varying vec3 vColor; varying vec2 vUv; varying float vGlow;
void main(){ float s=1.-distance(vUv,vec2(.5))*2.; s=clamp(s,0.,1.); vec3 c=vColor*s; c+=vec3(1.,.7,.8)*vGlow*s*.6; gl_FragColor=vec4(c*(1.+vGlow*.7),1.); }`;
const SNOW_V = `#define M_PI 3.1415926535897932384626433832795
uniform float uTime,uSize; attribute float aScale,phi,random,random1; attribute vec3 aColor; varying vec3 vColor; varying vec2 vUv;
void main(){ float t=mod((-uTime+100.)*.06*random1+random*2.*M_PI,2.*M_PI); vec3 off=vec3(5.85*cos(phi*t),2.*(t-M_PI),3.*sin(phi*t/t));
  vec4 vp=viewMatrix*modelMatrix*vec4(off,1.); vp.xyz+=position*aScale*uSize; gl_Position=projectionMatrix*vp; vColor=aColor; vUv=uv; }`;
const SNOW_F = `uniform sampler2D uTex; varying vec3 vColor; varying vec2 vUv;
void main(){ vec3 tx=texture2D(uTex,vUv).rgb; float s=1.-distance(vUv,vec2(.5,.62))*2.; gl_FragColor=vec4(tx*vColor*(clamp(s,0.,1.)+.3),1.); }`;
const CRYSTAL_V = `varying vec3 vN; varying vec3 vV; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.); vN=normalize(normalMatrix*normal); vV=-mv.xyz; gl_Position=projectionMatrix*mv; }`;

function heartSprite() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); g.translate(64, 70);
  g.shadowColor = '#ff3f78'; g.shadowBlur = 24; const gr = g.createRadialGradient(-10, -14, 4, 0, 0, 56); gr.addColorStop(0, '#fff'); gr.addColorStop(.45, '#ff9eb8'); gr.addColorStop(1, '#ff3f78'); g.fillStyle = gr;
  g.beginPath(); g.moveTo(0, 40); g.bezierCurveTo(-60, -4, -36, -48, 0, -20); g.bezierCurveTo(36, -48, 60, -4, 0, 40); g.fill();
  const tx = new THREE.CanvasTexture(c); return tx;
}
function glowTex() { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,.8)'); gr.addColorStop(.25, 'rgba(255,63,120,.5)'); gr.addColorStop(1, 'rgba(255,63,120,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); }

export function createCrystal(ctx) {
  const root = ctx.el, host = root.querySelector('#crCanvas'), l1 = root.querySelector('#crLine1'), l2 = root.querySelector('#crLine2'), tip = root.querySelector('#crTip');
  let S = null, tl = null, unlockT = 0, gen = 0;

  function instanced(count, attrs) {
    const sq = new THREE.PlaneGeometry(1, 1), geo = new THREE.InstancedBufferGeometry(); Object.keys(sq.attributes).forEach((k) => (geo.attributes[k] = sq.attributes[k])); geo.index = sq.index; geo.instanceCount = count;
    Object.entries(attrs).forEach(([k, [arr, n]]) => geo.setAttribute(k, new THREE.InstancedBufferAttribute(arr, n))); return geo;
  }
  async function build() {
    const mob = isMobile(), W = host.clientWidth || innerWidth, H = host.clientHeight || innerHeight, dpr = Math.min(devicePixelRatio || 1, mob ? 1.5 : 2);
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0x16000a);
    const camera = new THREE.PerspectiveCamera(55, W / H, .1, 100), camZ = () => (camera.aspect < .8 ? 11.5 : camera.aspect < 1.2 ? 9 : 7); camera.position.set(0, 0, camZ());
    const renderer = new THREE.WebGLRenderer({ antialias: !mob }); renderer.setPixelRatio(dpr); renderer.setSize(W, H); host.appendChild(renderer.domElement);
    const disposables = [], tex = heartSprite(); disposables.push(tex);
    const pal = ['#ffffff', '#ff3f78', '#ff9eb8', '#8f1235', '#ff2f9a', '#ff5fa0', '#b06bff', '#dc143c'].map((c) => new THREE.Color(c));
    // heart particles
    const count = mob ? 3200 : 7000, sc = new Float32Array(count), co = new Float32Array(count * 3), sp = new Float32Array(count), r0 = new Float32Array(count), r1 = new Float32Array(count);
    for (let i = 0; i < count; i++) { r0[i] = Math.random(); r1[i] = Math.random(); sc[i] = Math.random() * .35; const c = pal[(Math.random() * pal.length) | 0]; co.set([c.r, c.g, c.b], i * 3); sp[i] = Math.random() * 12.5 * Math.PI; }
    const hg = instanced(count, { random: [r0, 1], random1: [r1, 1], aScale: [sc, 1], aSpeed: [sp, 1], aColor: [co, 3] });
    const hm = new THREE.ShaderMaterial({ vertexShader: HEART_V, fragmentShader: HEART_F, uniforms: { uTime: { value: 0 }, uSize: { value: mob ? .36 : .3 }, uTex: { value: tex }, uPulse: { value: 0 }, uGlow: { value: 0 }, uMouse: { value: new THREE.Vector2(99, 99) } }, depthWrite: false, blending: THREE.AdditiveBlending, transparent: true });
    const heart = new THREE.Mesh(hg, hm); heart.frustumCulled = false; scene.add(heart); disposables.push(hg, hm);
    // drifting hearts ("snow")
    const sn = mob ? 220 : 480, s2 = new Float32Array(sn), c2 = new Float32Array(sn * 3), ph = new Float32Array(sn), a0 = new Float32Array(sn), a1 = new Float32Array(sn); const sc2 = ['#ff3f78', '#ff9eb8', '#ff2f9a', '#ffd58a'].map((c) => new THREE.Color(c));
    for (let i = 0; i < sn; i++) { ph[i] = (Math.random() - .5) * 10; a0[i] = Math.random(); a1[i] = Math.random(); s2[i] = Math.random() * .35; const c = sc2[(Math.random() * sc2.length) | 0]; c2.set([c.r, c.g, c.b], i * 3); }
    const sg = instanced(sn, { phi: [ph, 1], random: [a0, 1], random1: [a1, 1], aScale: [s2, 1], aColor: [c2, 3] });
    const sm = new THREE.ShaderMaterial({ vertexShader: SNOW_V, fragmentShader: SNOW_F, uniforms: { uTime: { value: 0 }, uSize: { value: .3 }, uTex: { value: tex } }, depthWrite: false, blending: THREE.AdditiveBlending, transparent: true });
    const snow = new THREE.Mesh(sg, sm); snow.frustumCulled = false; scene.add(snow); disposables.push(sg, sm);
    // procedural crystal heart (faceted, glassy, rim-lit)
    const shape = new THREE.Shape(); shape.moveTo(0, -1.55); shape.bezierCurveTo(-2.2, -.2, -1.9, 1.55, -.62, 1.55); shape.bezierCurveTo(-.2, 1.55, 0, 1.2, 0, .95); shape.bezierCurveTo(0, 1.2, .2, 1.55, .62, 1.55); shape.bezierCurveTo(1.9, 1.55, 2.2, -.2, 0, -1.55);
    const cg = new THREE.ExtrudeGeometry(shape, { depth: .7, bevelEnabled: true, bevelSegments: 3, bevelSize: .22, bevelThickness: .28, curveSegments: 7 }); cg.center();
    const cm = new THREE.MeshPhysicalMaterial({ color: 0xff3f78, emissive: 0x4a0420, metalness: .15, roughness: .08, clearcoat: 1, transparent: true, opacity: .5, flatShading: true, side: THREE.DoubleSide, depthWrite: false });
    const crystal = new THREE.Mesh(cg, cm); crystal.scale.setScalar(.95); scene.add(crystal); disposables.push(cg, cm);
    const rimMat = new THREE.ShaderMaterial({ vertexShader: CRYSTAL_V, fragmentShader: `varying vec3 vN; varying vec3 vV; uniform float uAmt; void main(){ float f=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.2); gl_FragColor=vec4(mix(vec3(.55,.05,.2),vec3(1.,.62,.78),f)*f*1.4*uAmt,f*uAmt); }`, uniforms: { uAmt: { value: 1 } }, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.FrontSide });
    const rim = new THREE.Mesh(cg, rimMat); rim.scale.setScalar(.97); scene.add(rim); disposables.push(rimMat);
    scene.add(new THREE.AmbientLight(0xff9eb8, .5)); const l1p = new THREE.PointLight(0xff3f78, 30, 14), l2p = new THREE.PointLight(0xb06bff, 14, 14); l1p.position.set(3, 3, 4); l2p.position.set(-3, -2, 3); scene.add(l1p, l2p);
    const gtex = glowTex(), aura = new THREE.Sprite(new THREE.SpriteMaterial({ map: gtex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: .75 })); aura.scale.set(9, 9, 1); aura.position.z = -1.5; scene.add(aura); disposables.push(gtex, aura.material);
    // orbiting photos
    const items = [], n = Math.min(mob ? 6 : 9, memories.length), starTex = gtex;
    for (let i = 0; i < n; i++) {
      const { canvas, aspect } = await framedCard(i), pt = new THREE.CanvasTexture(canvas); pt.colorSpace = THREE.SRGBColorSpace; pt.anisotropy = 4;
      const w = (mob ? .7 : .86) * rand(.85, 1.15), h = w / aspect, mat = new THREE.MeshBasicMaterial({ map: pt, transparent: true, opacity: 0, depthWrite: false });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); mesh.userData.i = i;
      const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: gtex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0, color: 0xff6f9c })); gl.scale.set(w * 2.1, h * 2, 1); gl.position.z = -.05;
      const holder = new THREE.Group(); holder.add(gl, mesh); scene.add(holder); disposables.push(pt, mat, mesh.geometry, gl.material);
      items.push({ holder, mesh, gl, mat, w, h, i, th: (i / n) * 6.2832 + rand(-.2, .2), rx: rand(mob ? 2.5 : 3.6, mob ? 3.2 : 5.0), rz: rand(1.4, 2.6), y: rand(-1.9, 1.9) * (mob ? 1.25 : 1), om: rand(.12, .22) * (i % 2 ? 1 : -1), bob: rand(0, 6.28), hov: 0, out: 0, appear: 0, tilt: rand(-.12, .12), off: new THREE.Vector3() });
    }
    S = { scene, camera, renderer, heart, hm, sm, crystal, cm, rim, rimMat, aura, items, disposables, camZ, mouse: new THREE.Vector2(), mw: new THREE.Vector3(99, 99, 0), ray: new THREE.Raycaster(), hoverItem: null, heartHot: 0, pulse: 0, raf: 0, clock: new THREE.Clock(), lastTip: -1, t: 0, spin: 0, tx: 0, ty: 0, l1p, l2p };
    const el = renderer.domElement;
    S.onMove = (e) => { const r = el.getBoundingClientRect(); S.mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); S.has = true; S.pt = e.pointerType; };
    S.onLeave = () => { S.has = false; };
    el.addEventListener('pointermove', S.onMove); el.addEventListener('pointerdown', S.onMove); el.addEventListener('pointerleave', S.onLeave);
    S.onResize = () => { const w = host.clientWidth, h = host.clientHeight; if (!w) return; camera.aspect = w / h; camera.updateProjectionMatrix(); camera.position.z = camZ(); renderer.setSize(w, h); };
    addEventListener('resize', S.onResize);
  }

  const v3 = new THREE.Vector3(), tmp = new THREE.Vector3();
  function loop() {
    if (!S) return; S.raf = requestAnimationFrame(loop); const dt = Math.min(.05, S.clock.getDelta()); S.t += dt; const time = S.t;
    S.hm.uniforms.uTime.value -= dt * .8; S.sm.uniforms.uTime.value -= dt * .4; // original ran uTime backwards at ~0.5/s
    // pointer → world plane (z=0), hover tests
    let overHeart = false, hov = null;
    if (S.has) {
      S.ray.setFromCamera(S.mouse, S.camera); const d = -S.ray.ray.origin.z / S.ray.ray.direction.z; S.ray.ray.at(d, S.mw);
      const hit = S.ray.intersectObjects(S.items.map((i) => i.mesh), false)[0]; hov = hit ? S.items.find((i) => i.mesh === hit.object) : null;
      overHeart = !hov && Math.hypot(S.mw.x / 2.3, S.mw.y / 2.0) < 1;
      S.camTargetX = S.mouse.x * .35; S.camTargetY = S.mouse.y * .25;
    } else { S.camTargetX = 0; S.camTargetY = 0; S.mw.set(99, 99, 0); }
    S.camera.position.x += (S.camTargetX - S.camera.position.x) * .05; S.camera.position.y += (S.camTargetY - S.camera.position.y) * .05; S.camera.lookAt(0, 0, 0);
    S.heartHot += ((overHeart ? 1 : 0) - S.heartHot) * .08; S.hm.uniforms.uGlow.value = Math.max(S.heartHot, S.hoverItem ? .5 : 0); S.hm.uniforms.uMouse.value.set(S.mw.x, S.mw.y);
    const beat = 1 + Math.pow(Math.max(0, Math.sin(time * 2.6)), 6) * .06; S.pulse += ((overHeart ? 1 : 0) - S.pulse) * .08; S.hm.uniforms.uPulse.value = S.pulse;
    const sc = .95 * beat * (1 + S.heartHot * .06); S.crystal.scale.setScalar(sc); S.rim.scale.setScalar(sc * 1.02); S.crystal.rotation.y = S.rim.rotation.y = Math.sin(time * .5) * .5; S.crystal.rotation.x = S.rim.rotation.x = Math.sin(time * .35) * .12;
    S.cm.opacity = .32 + S.heartHot * .22; S.rimMat.uniforms.uAmt.value = 1 + S.heartHot * .8; S.aura.material.opacity = .42 + Math.sin(time * 2.6) * .08 + S.heartHot * .3; S.aura.scale.setScalar(8.5 + S.heartHot * 1.5);
    S.hoverItem = hov;
    for (const it of S.items) {
      it.th += it.om * dt * (REDUCED ? 0 : 1); const x = Math.cos(it.th) * it.rx, z = Math.sin(it.th) * it.rz, y = it.y + Math.sin(time * .7 + it.bob) * .18;
      it.hov += ((hov === it ? 1 : 0) - it.hov) * .14; it.out += (S.heartHot - it.out) * .06;
      v3.set(x, y, z); tmp.copy(v3).setZ(0).normalize().multiplyScalar(it.out * .55); v3.add(tmp);
      if (it.hov > .01 && S.has) { tmp.set(S.mw.x - v3.x, S.mw.y - v3.y, 0).multiplyScalar(.18 * it.hov); v3.add(tmp); v3.z += it.hov * .35; }
      it.holder.position.copy(v3); it.holder.quaternion.copy(S.camera.quaternion); it.holder.rotateZ(it.tilt + Math.sin(time * .5 + it.bob) * .05);
      const depthFade = .55 + .45 * ((z + it.rz) / (2 * it.rz)); it.holder.scale.setScalar((.4 + .6 * it.appear) * (1 + it.hov * .18) * (.8 + depthFade * .25));
      it.mat.opacity = it.appear * (z < -.5 ? .78 : 1); it.mat.color.setScalar((.78 + depthFade * .22) * (1 + it.hov * .4)); it.gl.material.opacity = it.appear * (.28 + it.hov * .7 + it.out * .25); it.holder.renderOrder = z > 0 ? 3 : 0; it.mesh.renderOrder = z > 0 ? 4 : 0;
    }
    S.l1p.intensity = 30 + S.heartHot * 30;
    tipUpdate(hov); S.renderer.domElement.style.cursor = hov ? 'pointer' : '';
    S.renderer.render(S.scene, S.camera);
  }
  function tipUpdate(it) {
    if (!it) { tip.style.opacity = 0; S.lastTip = -1; return; } if (S.lastTip !== it.i) { tip.textContent = memories[it.i].caption || ''; S.lastTip = it.i; }
    v3.copy(it.holder.position).project(S.camera); const r = host.getBoundingClientRect(), x = (v3.x * .5 + .5) * r.width, y = (-v3.y * .5 + .5) * r.height;
    tip.style.left = Math.max(90, Math.min(r.width - 90, x)) + 'px'; tip.style.top = Math.min(r.height - 70, y + 70) + 'px'; tip.style.opacity = tip.textContent ? 1 : 0;
  }
  function destroy() {
    if (!S) return; cancelAnimationFrame(S.raf); const el = S.renderer.domElement; el.removeEventListener('pointermove', S.onMove); el.removeEventListener('pointerdown', S.onMove); el.removeEventListener('pointerleave', S.onLeave); removeEventListener('resize', S.onResize);
    S.disposables.forEach((d) => d.dispose && d.dispose()); S.renderer.dispose(); S.renderer.forceContextLoss(); el.remove(); S = null;
  }
  return {
    async enter() {
      const my = ++gen; trail.setBase('dark'); tl && tl.kill(); clearTimeout(unlockT); destroy(); gsap.set([l1, l2], { opacity: 0, y: 14 }); l1.textContent = t(C.crystal.line1); l2.textContent = t(C.crystal.line2);
      await build(); if (my !== gen) { destroy(); return; } S.clock.start(); loop();
      S.camera.position.z = S.camZ() + 5; tl = gsap.timeline();
      tl.to(S.camera.position, { z: S.camZ(), duration: REDUCED ? .1 : 3, ease: 'power3.out' }, 0)
        .to(S.items, { appear: 1, duration: 2.4, stagger: .35, ease: 'power2.out' }, 1.2)
        .to(l1, { opacity: 1, y: 0, duration: 2, ease: 'power2.out' }, 2.4)
        .to(l2, { opacity: 1, y: 0, duration: 2.2, ease: 'power2.out' }, 5);
      unlockT = setTimeout(() => ctx.unlock(), 8000);
    },
    exit() { gen++; clearTimeout(unlockT); tl && tl.kill(); destroy(); tip.style.opacity = 0; }
  };
}
