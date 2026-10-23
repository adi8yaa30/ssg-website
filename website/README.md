# SSG home page

The landing page for Shree Shyam Group, built with plain HTML, CSS and JS, plus GSAP 3.13, Lenis and Three.js (for the GLB only). There is no build step.

## Run locally

Double-click `index.html`. It works straight from disk: when opened as a `file://` page, the model, the two scanline SVGs and the flag image are read from small embedded copies (`<asset>.js`), because browsers block `fetch()` of local files.

For production-like loading (smaller downloads, preloading), serve the folder instead:

```bash
cd website && python3 -m http.server 5173
```

Then open http://localhost:5173.

If you change `ssg-streetlight.web.glb`, `cta-skyline.svg`, `footer-landscape.svg`, `national-flag.webp` or the four process step drawings in `assets/07-process/`, regenerate the embedded copies:

```bash
cd website && python3 tools/embed-local-assets.py
```

`cta-skyline.svg` and `footer-landscape.svg` are built from the original exports in `../assets` by `tools/optimize-svg.py` (fewer vertices and compact path data: the skyline goes from 1.3 MB to 190 KB and looks the same). If the exports change, run it before the embed script:

```bash
cd website && python3 tools/optimize-svg.py && python3 tools/embed-local-assets.py
```

## Theme

The `dark-theme` branch has the **dark "Golden Dusk" theme** (post-sunset, muted slate with gold accents, street lights on), taken from the client's reference `../client-colour-reference.png`. The spec is `../instructions.md` §12, and it overrides the light colours in the Figma images. `main` auto-deploys, so merge only after the client approves.

- Every colour is a token in `css/tokens.css`; the 3D reads `--gold`, `--sun`, `--night` and `--earth` from CSS at load.
- The scanline SVGs are recoloured by `tools/optimize-svg.py` (re-run it, then the embed script, if the exports change). The flag sky is a raster and is recoloured by the `#duo-dusk` / `#duo-warm` SVG filters in `index.html`.
- Interim product images come from the daytime ones: `python3 tools/cutout-products.py` writes `photo-dusk.webp` (white sky cut out) and `blueprint-dusk.webp` (warm-white lines on transparent) next to the originals. The dusk grade is CSS. When the client's dusk photos arrive, replace the `photo-dusk.webp` files and drop the `filter` on `.slide__photo img`.
- Re-render the static 3D fallbacks from the page itself: open `http://localhost:5173/?debug` and run `await window.__ssg.sceneApi.captureStreetlight(800, 1375)` (→ `assets/01-hero/streetlight-fallback.webp`) and `await window.__ssg.sceneApi.capturePanel(1030, 626)` (→ `assets/01-hero/panel-static.webp`). Each returns a WebP `Blob` with the dusk lighting, the LED on and bloom.

## Store intro

The first thing a visitor sees is the SSG store at dusk (`js/intro.js`). Scrolling (400vh, pinned) walks the camera over the paving to the entrance, the glass doors slide open, the camera steps through into the showroom and settles in front of the glowing SSG wall; then the warm light takes over and collapses onto the hero's gold horizon line, which sweeps away to reveal the home page.

- **Pacing.** Scrolling sets where the camera is heading, but it travels there no faster than each stage allows (`STAGES` in `intro.js`: approach 2.8 s, doors 1.8 s, inside 2.8 s, the wall 1.2 s). A hard trackpad swipe therefore still plays the whole visit (~10 s) instead of jumping to the site; a slow scroll is followed as it goes. Scrolling back up walks back out (until the visit is entered). It is one-way: the intro is removed from the DOM and its GPU resources are disposed, so scrolling back up stays on the hero.

- **Once per session.** A `sessionStorage` flag (`ssg-intro-seen`) skips it for the rest of the session. `?intro` forces it, `?nointro` skips it, and `?intro=3d|video|static` forces a version (QA).
- **Skip.** The `SKIP INTRO` button or Esc goes straight to the transition.
- **Versions** (picked in `main.js`): live 3D on desktop with WebGL; a poster plus a pre-rendered fly-in video (played on scroll or tap) on phones, low-power devices and `file://`; and the poster with a gentle fade for reduced motion or no WebGL.
- **If the store can't load** within 20 s, the visitor gets the normal preloader and hero.
- **Loading order.** The store GLB loads first (it drives the preloader's battery bar). The street light GLB loads in the background only after that, and its textures are uploaded a few ms per frame while the intro plays. Both scenes share the page's one WebGL renderer (`SSG.createRenderer` in `scene.js`).
- **Model.** `assets/00-intro/ssg-store.web.glb` is built from `../assets/ssg-store-hq.glb` by `tools/optimize-store.mjs`. It is 9.1 MB and 274k triangles (from 30 MB and 986k). The vegetation is thinned (it is single triangles and two-triangle blades, so it can't be simplified). Textures are re-encoded per role (colour maps WebP q94, normal maps near-lossless, roughness q90; ≤ 2048 px, 1024 for ground and vegetation, 512 for the unseen roof), keeping the source bytes when that is smaller: a blanket lossy re-encode visibly smeared the wood, paving and leaves. Geometry is Draco with 14-bit UVs and 12-bit normals. Node names (`Door_L`, `Door_R`, `Glass`) and materials are kept.
- **Fallback media.** The posters and fly-in videos are rendered from the live scene by `tools/render-intro-media.mjs` (it needs the dev server, Google Chrome and ffmpeg). Re-run it after changing the scene:

```bash
cd website/tools && npm install && node optimize-store.mjs && node render-intro-media.mjs
```

- **Performance** (measured on a 2019 MacBook Pro, Radeon Pro 5300M, Chrome, 1440×900 at 2× rendering at 1.75 = 2520×1575): 60 fps through the visit (median and p95 16.7–16.8 ms; 9 of 804 frames over 20 ms) with the earlier renderer (pixel ratio 1.25 while moving, no SMAA); the sharper renderer below adapts its resolution to hold that, but has not been re-measured on an unthrottled machine yet. Resolution is dynamic: it renders at 1.75 and steps down (1.5, 1.25) only while measured frame times stay above ~20 ms, with hysteresis so it doesn't bounce. Edges are smoothed by 4× MSAA at 1×, and by an SMAA pass at Retina ratios, where 4× MSAA dropped ~15 % of frames. Textures use full anisotropic filtering (the paving is seen at grazing angles). Transmission glass cost 10–12 ms a frame near the doors, so the glass is a cheap reflective material instead (< 1 ms). The render loop stops and the scene is disposed after the transition. Not measured on an M1 Air.
- **Debugging.** With `?debug`, `window.__ssg.intro` exposes `setProgress(p)` (pose the flight), `store.bench(n, p)` (GPU-synced ms per frame), `store.setGlass('cheap' | 'transmission')`, `store.state.adaptive` (pixel-ratio switching) and `store.tune` (lights, materials and bloom, for live tuning); `?msaa=0|2|4`, `?aa=0` (no SMAA), `?pr=1.5` (pinned pixel ratio) and `?store=hq` (load the 30 MB source) are for comparisons, and the console logs the intro → hero hand-off timings.

## Structure

```
index.html          all sections, inline icons and the exploded-parts SVG
                    (scripts are plain deferred scripts sharing window.SSG, not ES modules)
css/reset.css
css/tokens.css      colours, fonts, the --u Figma-pixel unit, z-index layers
css/main.css        section styles, plus tablet, mobile and reduced-motion rules
js/main.js          (loads last) Lenis + GSAP setup, preloader, store intro boot, hero, panel
                    choreography wiring, section reveals, nav, quote modal (asset mapping at the top)
js/intro.js         store intro: the store scene at dusk, the scroll fly-in, skip, fallbacks
js/scene.js         Three.js scene, panelRig, DOM-anchored poses (states A–E); also the shared
                    three.js loader and the page's one WebGL renderer
js/products.js      pinned horizontal slider on continuous grass
js/process.js       diamond hover states and the exploded components row
js/flag.js          WebGL wave on the national flag
js/scanlines.js     CTA skyline and footer landscape row animations
assets/             web-ready copies of the provided assets (kebab-case),
                    plus *.js embedded copies used when opened from disk
tools/              embed-local-assets.py (regenerates those embedded copies),
                    optimize-svg.py (rebuilds the light scanline SVGs from the exports),
                    optimize-store.mjs + render-intro-media.mjs (store intro model and media, see below)
TODO.md             missing assets and things to confirm with the client
```

## Notes

- **Layout unit.** `--u` is one Figma pixel on the 1728-wide frame, so `calc(N * var(--u))` reproduces the design at every desktop width.
- **3D anchoring.** The 3D is anchored to `#anchor-streetlight`, `#anchor-panel-why` and `#anchor-panel-sun`, and recomputed every frame. To move the light or the panels, move those divs in CSS.
- **Fallbacks.** On mobile (< 768 px), without WebGL, or with `prefers-reduced-motion`, the page uses static images instead: `streetlight-fallback.webp` and `panel-static.webp`, which was rendered from the GLB.
- **Debugging.** Add `?debug` to the URL to expose `window.__ssg` (scene state, GSAP, ScrollTrigger). `window.__ssg.sceneApi.capturePanel()` re-renders the static panel image.

## Landscape quality update

The hero GLB includes 39,205 curved grass blades, paired three-dimensional shrub
leaves and woody stems. Vertex colors contain deterministic color variation,
root darkening, local ambient occlusion and sun occlusion. These are baked into
the mesh, so there is no additional per-frame shadow pass. The GLB is about
4.75 MB; the existing hardware meshes, textures, node transforms and detachable
panel assembly are preserved. The static mobile/reduced-motion image and the
embedded `file://` model have also been updated.

For a close inspection and before/after comparison, open
`http://localhost:5173/tools/landscape-preview.html` while the local server runs.
This development preview still uses the original studio lighting, not the dusk
lighting; render the dusk fallbacks from the page instead (see Theme above).

Rebuild from the preserved original asset using Blender 5.1:

```bash
/Applications/Blender.app/Contents/MacOS/Blender -b -t 4 --python tools/rebuild-landscape.py
python3 tools/embed-local-assets.py
python3 tools/verify-landscape.py
```

Run these commands from `website/`. After future asset edits, increment the
`landscape-4` URL version in `index.html`, `js/scene.js` and the preview together.
Keep the unversioned model path for `file://` embedding. (The preview's **Mobile
render → Save render** exports a daytime-lit fallback; for the dark theme use
`captureStreetlight()` instead.)
Original GLB and fallback backups are retained under `tools/backups/`.
