# SSG website: TODO

## Missing assets (placeholders in use)

- [ ] **Semi-Integrated Street Light product photo on grass.** The export only has the blueprint. `assets/02-products/01-semi-integrated/photo-placeholder.webp` is a crop of the Figma product frame (text and blueprint removed). Please send a **1672 × 941** photo matching the other five.
- [ ] **Higher-resolution Semi-Integrated blueprint.** The current one (`blueprint.webp`) is only 550 × 310 px.
- [ ] **Brochure PDF.** "Download Brochure" shows a "coming soon" toast (`[data-brochure]` in `index.html`).
- [ ] **Social media URLs** (Instagram, Facebook, LinkedIn), **Careers** page, **Terms** and **Privacy** pages. These links currently show a "Link coming soon" toast (`[data-todo]`).
- [ ] **Form backend.** "Request a Quote" / "Enquire Now" open a modal whose Send button composes an email to shyaminfratech.co.in@gmail.com (`mailto:`). Replace it with the client's form endpoint or CRM (`js/main.js`, the `form.addEventListener('submit', …)` handler).
- [ ] **Divisions page.** The nav "Divisions" link points at the National Flag section for now. Confirm where it should go.

## Dark theme (Golden Dusk, see `../instructions.md` §12)

Built on the `dark-theme` branch (not merged: `main` auto-deploys). Preview screenshots at 1440 and 390 px, reduced motion and the hero next to the client's reference are in `../qa-screenshots/` (not committed).

### Done

- [x] Tokens (§12.2) and every hard-coded light colour replaced; no `#2744DF` outside the restricted `--brand-blue` token.
- [x] Section backgrounds and the §7 rhythm; hero and Why SSG on their own gradients with a seamless join.
- [x] Text colours, dark button variants and a contrast pass: all visible text meets §12.3 at 1440 and 390 px (lowest 5.2:1, Why SSG card body on glass).
- [x] Gold wave lines: hero streaks, seam dividers (Why/Products, Mission/Flag, Sun/Logos), gold circuit lines + pulses, callouts and the process connector.
- [x] 3D at dusk: LED on with flicker-on, warm spot cone, bloom (transparent canvas kept), dusk key/fill/rim, env at 0.35, gold sweep on the panel, first light in Powered by the Sun.
- [x] Re-rendered `streetlight-fallback.webp` and `panel-static.webp` with dusk lighting and the LED on.
- [x] Scanline art: CTA skyline, footer landscape (via `tools/optimize-svg.py`) and the flag sky (duotone filters, since it is a raster) recoloured, with glowing lamps and gold horizons.
- [x] Interim images: product cut-outs + grade + lamp glows, warm-white blueprints (`tools/cutout-products.py`), graded mission mosaic and project photo (its flag stays true colour), logos on warm-white chips.
- [x] Nav, preloader, and the custom cursor from §4/§12.6, which had never been built and is now added in the dusk colours.

### Confirm with the client

- [ ] **Brand blue decision:** gold and slate replace `#2744DF` everywhere by default. Ask the client whether the blue must stay visible; if so, it is used only on the primary "Request a Quote" button (§12.3).
- [ ] **Dusk versions of all six product photos** on continuous grass, matching `client-colour-reference.png`: muted slate sky, gold horizon, LED switched on, no white background. The interim is a cut-out (`photo-dusk.webp`) with a CSS grade; the daytime originals are kept.
- [ ] **Dusk versions of the Mission mosaic photo and the flag project photo** (the interim is a CSS grade).
- [ ] **Sign-off on the hero gradient** (slate → thin gold horizon). Note: the gold line was raised from §12.2's 92–100% to ~87–91% of the hero so it glows behind the grass island (approved internally); on phones it is a band tied to the street light.
- [ ] **Hero sun:** it is the brightest element on the first screen (flat `--sun`, Figma size), where the reference has a small, low sun. Confirm it reads as intended, or make it smaller / dimmer.

### Follow-ups

- [ ] Phones have a small (4 px) horizontal overflow that predates the dark theme (it is on `main` too).
- [ ] `tools/landscape-preview.html` still uses the old studio lighting; the dusk fallbacks are rendered from the page itself (see README).

## Asset issues found in the export

- **Product photos were misfiled.** The grass photos did not match their folders or blueprints. Each photo is now paired with its blueprint by what it shows:
  - All-in-One ← `5. Flood-Light/5.png`
  - AC Street Light ← `2. All-in-Solar-Street-Light/2.png`
  - Flood Light ← `4. AC-Street-Light/4.png`
  - Hybrid (`3 copy.png`) and High Mast (`6.png`) were already correct.

  Please confirm this pairing with the client.
- **Pole-stand exploded SVG has 3 of the 4 bolts.** The fourth bolt in the Figma frame is not in `pole-stand-svg.zip`; the identical bolt vector is reused at that position.
- **Exploded components had no position data.** The zips contain loose vectors only. Their positions were recovered by matching each piece against the Figma process frame. If the designer can export each component as a single grouped SVG, swap them in (`.exploded__svg` in `index.html`).

## Confirm with the client before going live

- [ ] Permission to display the **Government of Assam emblem**, the **Indian Army emblem** and the other government seals in "Proudly associated with". State emblem use is legally restricted.
- [ ] That SSG is actually listed on **GeM**, and the **"4 certifications"** and **"100% inspected before dispatch"** claims (Our Mission stats, Why SSG card).
- [ ] The **"Panchayats, municipalities, schools and departments"** client claim in the CTA.
- [ ] The **pole height range.** The brochure says both **3–12 m** and **5–30 m (customised)**. The site uses 5–30 m (hero callout, High Mast slide).
- [ ] The featured flag project: location (**Arunachal Pradesh**) and height (**100 ft**).
- [ ] The brand name spelling: **Shree** vs **Sri** Shyam Group (the brochure uses both). The site uses "Shree".
- [ ] Product spec ranges on all six slides (wattages, battery Ah, panel W, lifespans).

## Nice to have

- [ ] An optimised, licence-cleared **map embed** for the footer card (currently an "Open in Maps" link).
- [ ] A Lighthouse pass on the production host with caching and compression on. Heaviest assets: `03-mission/image.webp` (690 KB), `footer-landscape.svg` (300 KB, compresses well with gzip or brotli) and the GLB (1.95 MB, desktop only).
