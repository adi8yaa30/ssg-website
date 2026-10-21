# SSG home page

The landing page for Shree Shyam Group, built with plain HTML, CSS and JS, plus GSAP 3.13, Lenis and Three.js (for the GLB only). There is no build step.

## Run locally

Double-click `index.html`. It works straight from disk: when opened as a `file://` page, the model, the two scanline SVGs and the flag image are read from small embedded copies (`<asset>.js`), because browsers block `fetch()` of local files.

For production-like loading (smaller downloads, preloading), serve the folder instead:

```bash
cd website && python3 -m http.server 5173
```

Then open http://localhost:5173.

If you change `ssg-streetlight.web.glb`, `cta-skyline.svg`, `footer-landscape.svg` or `national-flag.webp`, regenerate the embedded copies:

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

## Structure

```
index.html          all sections, inline icons and the exploded-parts SVG
                    (scripts are plain deferred scripts sharing window.SSG, not ES modules)
css/reset.css
css/tokens.css      colours, fonts, the --u Figma-pixel unit, z-index layers
css/main.css        section styles, plus tablet, mobile and reduced-motion rules
js/main.js          (loads last) Lenis + GSAP setup, preloader, hero, panel choreography wiring,
                    section reveals, nav, cursor, quote modal (asset mapping at the top)
js/scene.js         Three.js scene, panelRig, DOM-anchored poses (states A–E)
js/products.js      pinned horizontal slider on continuous grass
js/process.js       diamond hover states and the exploded components row
js/flag.js          WebGL wave on the national flag
js/scanlines.js     CTA skyline and footer landscape row animations
assets/             web-ready copies of the provided assets (kebab-case),
                    plus *.js embedded copies used when opened from disk
tools/              embed-local-assets.py (regenerates those embedded copies),
                    optimize-svg.py (rebuilds the light scanline SVGs from the exports)
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
