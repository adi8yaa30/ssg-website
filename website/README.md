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
tools/              embed-local-assets.py (regenerates those embedded copies)
TODO.md             missing assets and things to confirm with the client
```

## Notes

- **Layout unit.** `--u` is one Figma pixel on the 1728-wide frame, so `calc(N * var(--u))` reproduces the design at every desktop width.
- **3D anchoring.** The 3D is anchored to `#anchor-streetlight`, `#anchor-panel-why` and `#anchor-panel-sun`, and recomputed every frame. To move the light or the panels, move those divs in CSS.
- **Fallbacks.** On mobile (< 768 px), without WebGL, or with `prefers-reduced-motion`, the page uses static images instead: `streetlight-fallback.webp` and `panel-static.webp`, which was rendered from the GLB.
- **Debugging.** Add `?debug` to the URL to expose `window.__ssg` (scene state, GSAP, ScrollTrigger). `window.__ssg.sceneApi.capturePanel()` re-renders the static panel image.
