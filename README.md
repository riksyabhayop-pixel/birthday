# ♡ Birthday site — six-chapter interactive story

Letter → Garden → Galaxy → Birthday tree → Crystal heart → Gift.

## Run it
ES modules need a web server (double-clicking index.html will not work):
```
cd birthday-site
python3 -m http.server 8000      # then open http://localhost:8000
```
or `npx serve`, VS Code "Live Server", or upload the folder to Netlify / GitHub Pages / Vercel.
Three.js and GSAP are bundled in `vendor/`, so the only online dependency is the Google Fonts link (it falls back to system serif fonts offline).

## Where to put your things
| What | Where |
|---|---|
| **Her name**, **your name** | `js/config.js` → `name`, `from` |
| **Photos** (up to 10) | replace `assets/photos/photo1.jpg … photo10.jpg` (same file names), or change `src` in `config.js`. Portrait or square works best. The current files are labelled placeholders. |
| **Photo captions / alt text** | `js/config.js` → `photos[i].caption` (shown on hover in the galaxy and crystal heart), `alt` (screen readers) |
| **Music** | replace `assets/music/birthday.mp3` or change `music` in `config.js` (`musicVolume` sets the default level) |
| **Letter text** (greeting, paragraphs, button labels) | `config.js` → `letter` |
| **Garden / galaxy / tree / crystal-heart messages** | `config.js` → `blossom`, `galaxy`, `birthday`, `crystal` |
| **Final birthday message, thanks, closing line, signature** | `config.js` → `gift` |

Use `{name}` and `{from}` inside any text and they are filled in automatically.

## Controls
Mouse wheel / ↑ ↓ ← → / swipe / chapter hearts (bottom) / **Skip → / Continue ♡** button.
Forward movement unlocks once a chapter's key moment has played (or use Skip). Chapter 1: hold to draw the bow, release to shoot (Space/Enter also shoots).
Music: ♫ button (bottom-left) mutes; hover it for a volume slider.

## Structure
```
index.html            all chapter markup
css/                  global.css (design tokens) + one file per chapter
js/main.js            wiring · navigation.js transitions/input · audio.js one persistent <audio>
js/cursorTrail.js     pink trail (+ touch ripples) · ambient.js shared particles · photos.js photo helpers
js/proposal.js blossom.js galaxy.js birthday.js crystalHeart.js birthdayGift.js   one module per chapter
vendor/               three.js r174, OrbitControls, GSAP
```
Performance: galaxy = 65k stars desktop / 40k laptop / 14k mobile; pixel ratio capped; the galaxy and crystal-heart WebGL renderers are created on entry and fully disposed on exit; every chapter loop stops when you leave. `prefers-reduced-motion` swaps cinematic transitions for quick fades and calms the particles.

## Notes
- The original blue/cyan "water" cursor was rebuilt in pink (hot pink, neon, rose, magenta, white) and switches to a deeper pink over light surfaces (the letter window).
- The crystal heart's original CodePen-hosted model/textures were replaced with generated ones, so nothing external is needed.
