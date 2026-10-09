/* Entry point — wires the six chapters into one continuous story. */
import { birthdayConfig as C, t } from './config.js';
import { audio } from './audio.js';
import { trail } from './cursorTrail.js';
import { createNavigation } from './navigation.js';
import { createProposal } from './proposal.js';
import { createBlossom } from './blossom.js';
import { createGalaxy } from './galaxy.js';
import { createBirthday } from './birthday.js';
import { createCrystal } from './crystalHeart.js';
import { createGift } from './birthdayGift.js';

const $ = (id) => document.getElementById(id);
const defs = [
  { id: 'ch-proposal', make: createProposal, transition: 'fade' },
  { id: 'ch-blossom', make: createBlossom, transition: 'iris' },   // letter → heart-shaped iris → garden
  { id: 'ch-galaxy', make: createGalaxy, transition: 'zoom' },     // flowers → zoom through the stars
  { id: 'ch-birthday', make: createBirthday, transition: 'fade' }, // sky fades into the tree
  { id: 'ch-crystal', make: createCrystal, transition: 'iris' },   // blossoms → heart iris → crystal heart
  { id: 'ch-gift', make: createGift, transition: 'bloom' }         // light blooms into the gift
];
let nav;
const chapters = defs.map((d, i) => {
  const el = $(d.id), ctx = { el, unlock: () => nav.unlock(i), next: () => nav.go(i + 1, { force: true }), restart: () => nav.go(0, { force: true }) };
  return { el, transition: d.transition, mod: d.make(ctx) };
});
nav = createNavigation(chapters, { trailMode: (m) => trail.setBase(m) });
trail.init();

$('introEyebrow').textContent = t(C.intro.eyebrow); $('introName').textContent = t('{name}'); $('introTap').textContent = t(C.intro.tap);
document.title = `Happy Birthday, ${C.name} ♡`;

let started = false;
function begin() {
  if (started) return; started = true; const intro = $('intro'); intro.classList.add('is-hidden'); setTimeout(() => (intro.hidden = true), 1300);
  audio.showControls(); nav.showChrome(); nav.start(0);
}
async function boot() {
  const ok = await audio.tryAutoplay();
  if (ok) { $('introTap').style.display = 'none'; setTimeout(begin, 1600); return; }   // autoplay allowed → no tap needed
  const go = (e) => { removeEventListener('pointerdown', go); removeEventListener('keydown', go); audio.start().finally(begin); };
  addEventListener('pointerdown', go); addEventListener('keydown', go);
}
boot();
window.__birthday = { nav, audio };   // handy for debugging in the console
