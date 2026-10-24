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

## About page

`about.html` (`css/about.css`, `js/about.js`) shares everything else with the home page through `js/core.js` (GSAP and the 'ssg' curve, Lenis, preloader, nav, modal, links, reveals) and `js/scanlines.js` (CTA skyline, footer landscape). No store intro and no 3D: a short (~0.8 s) preloader.

- **Background:** `--about-gradient` (tokens.css) behind every section; sections are transparent.
- **Sections:** hero, Our Story (pinned read-along), Mission & Vision, By the Numbers (odometers), From the Director, Our Values (glass cards, Phosphor icons inlined, MIT), Our Divisions (expanding panels), Our Journey (pinned horizontal timeline), Certifications (flip badges), In the Field (draggable gallery), and the home page's CTA + footer.
- **The gold thread** (`buildThread`): one line from the hero horizon, under the story quote, down the Mission/Vision divider, into the timeline track, then down into the CTA skyline, whose lamps switch on when it arrives (`initCtaSkyline({ lamps: 'manual' })`). It is drawn from anchors marked `data-thread` and measured once per layout; each straight run is placed with transforms only, so it never repaints while scrolling.
- **Page transition:** links between the two pages raise a night panel under a gold horizon line (`core.leaveTo`); the next page's preloader lifts away the same way. Deep links such as `index.html#products` skip the store intro and land on their section.
- **Phones:** every layout stacks, the timeline turns vertical, the divisions become open cards, the gallery swipes, and the thread runs down the left edge. **Reduced motion:** final states, no pins, scrambles or inertia, and the thread is shown complete.
- **Placeholders** (director portrait, two division images, timeline years, badge backs, gallery photos) are listed in `TODO.md`.

## Store intro

The first thing a visitor sees is the SSG store at dusk (`js/intro.js`). Scrolling (400vh, pinned) walks the camera over the paving to the entrance, the glass doors slide open, the camera steps through into the showroom and settles in front of the glowing SSG wall; then it pushes on as the view fades to the page's night colour, and the home page fades up with its normal load-in.

- **Pacing.** Scrolling sets where the camera is heading, but it travels there no faster than each stage allows (`STAGES` in `intro.js`: approach 2.8 s, doors 1.8 s, inside 2.8 s, the wall 1.2 s). A hard trackpad swipe therefore still plays the whole visit (~10 s) instead of jumping to the site; a slow scroll is followed as it goes. Scrolling back up walks back out (until the visit is entered). It is one-way: the intro is removed from the DOM and its GPU resources are disposed, so scrolling back up stays on the hero.

- **Once per session.** A `sessionStorage` flag (`ssg-intro-seen`) skips it for the rest of the session. `?intro` forces it, `?nointro` skips it, and `?intro=3d|video|static` forces a version (QA).
- **Skip.** The `SKIP INTRO` button or Esc goes straight to the transition.
- **Versions** (picked in `main.js`): live 3D on desktop with WebGL; a poster plus a pre-rendered fly-in video (played on scroll or tap) on phones, low-power devices and `file://`; and the poster with a gentle fade for reduced motion or no WebGL.
- **If the store can't load** within 45 s (it is an 18 MB download), the visitor gets the normal preloader and hero.
- **Loading order.** The store GLB loads first (it drives the preloader's battery bar). The street light GLB loads in the background only after that, and its textures are uploaded a few ms per frame while the intro plays. Both scenes share the page's one WebGL renderer (`SSG.createRenderer` in `scene.js`).
- **Model.** `assets/00-intro/ssg-store.glb` (18.3 MB, 265k triangles) is built from the original `../assets/ssg-store-hq.glb` (28.7 MB, 986k) by `tools/optimize-store.mjs`. Only the vegetation is reduced (lawn blades 435k → 55k, leaf canopies 420k → 89k, foliage 22k → 12k triangles): it is thinned rather than simplified (single triangles and two-triangle blades), weighted towards the camera path, and each kept leaf or blade grows a little to keep the coverage. The store, glass, doors, sign and paving keep every triangle, the textures keep their original bytes, and node names are unchanged. `node optimize-store.mjs --web` builds a lighter 9 MB variant (`?debug&store=web`).
- **Fallback media.** The posters (2560×1440 / 1440×2560 WebP) and fly-in videos (1920×1080 / 1080×1920 H.264, CRF 20, ~5.5–6 Mbps, 10.6 s, ~7.4 MB) are rendered from the live scene with 4× MSAA by `tools/render-intro-media.mjs` (it needs the dev server, Google Chrome and ffmpeg). Re-run it after changing the scene:

```bash
cd website/tools && npm install && node optimize-store.mjs && node render-intro-media.mjs
```

- **Rendering and performance.** The intro renders at the full device pixel ratio (capped at 2), drops to 1.5 only while the camera moves fast (> 1.5 m/s) and returns to full once it settles. Edges use 4× MSAA on the HDR target; if frames stay above ~20 ms for a second, the visit falls back to SMAA. `?debug` shows the mode, pixel ratio, anti-aliasing and FPS in an overlay. Measured on a 2019 MacBook Pro (Radeon Pro 5300M, Chrome, 1440×900 at 2×, CPU unthrottled): median 60 fps through the fly-in but ~28 % of frames over 20 ms, and MSAA falls back to SMAA. At 2× the target is 2880×1800 and the cost is per pixel (cutting 720k vegetation triangles barely changed it); at pixel ratio 1.5 with SMAA the same machine held a steady 60 fps. MSAA cuts frame-to-frame shimmer on the glazing seals and door frames by ~38 % compared with SMAA; the sub-pixel grass blades still shimmer slightly at any setting. Transmission glass cost 10–12 ms a frame near the doors, so the glass is a cheap reflective material. The render loop stops and the scene is disposed after the transition. Not measured on an M1 Air.
- **Debugging.** With `?debug`, `window.__ssg.intro` exposes `setProgress(p)` (pose the flight), `store.bench(n, p)` (GPU-synced ms per frame), `store.setGlass('cheap' | 'transmission')`, `store.state.adaptive` (pixel-ratio switching) and `store.tune` (lights, materials and bloom, for live tuning); `?msaa=0|2|4`, `?aa=0` (no SMAA), `?pr=1.5` (pinned pixel ratio) and `?store=<name>` (load `ssg-store.<name>.glb`) are for comparisons, and the console logs the intro → hero hand-off timings.

## Structure

```
index.html          all sections, inline icons and the exploded-parts SVG
                    (scripts are plain deferred scripts sharing window.SSG, not ES modules)
css/reset.css
css/tokens.css      colours, fonts, the --u Figma-pixel unit, z-index layers
css/main.css        section styles, plus tablet, mobile and reduced-motion rules
js/core.js          shared by every page: GSAP + the 'ssg' curve, Lenis, preloader, nav, toasts,
                    enquiry modal, link handling and the gold page transition (SSG.initCore)
js/main.js          (loads last) home page: store intro boot, hero, panel choreography wiring,
                    section reveals (asset mapping at the top)
about.html, css/about.css, js/about.js   the About page (see below)
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
