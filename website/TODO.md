# SSG website: TODO

## Missing assets (placeholders in use)

- [ ] **Semi-Integrated Street Light product photo on grass.** The export only has the blueprint. `assets/02-products/01-semi-integrated/photo-placeholder.webp` is a crop of the Figma product frame (text and blueprint removed). Please send a **1672 × 941** photo matching the other five.
- [ ] **Higher-resolution Semi-Integrated blueprint.** The current one (`blueprint.webp`) is only 550 × 310 px.
- [ ] **Brochure PDF.** "Download Brochure" shows a "coming soon" toast (`[data-brochure]` in `index.html`).
- [ ] **Social media URLs** (Instagram, Facebook, LinkedIn), **Careers** page, **Terms** and **Privacy** pages. These links currently show a "Link coming soon" toast (`[data-todo]`).
- [ ] **Form backend.** "Request a Quote" / "Enquire Now" open a modal whose Send button composes an email to shyaminfratech.co.in@gmail.com (`mailto:`). Replace it with the client's form endpoint or CRM (`js/main.js`, the `form.addEventListener('submit', …)` handler).
- [ ] **Divisions page.** The nav "Divisions" link points at the National Flag section for now. Confirm where it should go.

## Dark theme (Golden Dusk, see `../instructions.md` §12)

- [ ] **Brand blue decision:** gold and slate replace `#2744DF` everywhere by default. Ask the client whether the blue must stay visible; if so, it is used only on the primary "Request a Quote" button (§12.3).
- [ ] **Dusk versions of all six product photos** on continuous grass, matching `client-colour-reference.png`: muted slate sky, gold horizon, LED switched on, no white background. Until then, use the interim cut-out and grade from §12.7.
- [ ] **Dusk versions of the Mission mosaic photo and the flag project photo** (the interim is a CSS grade).
- [ ] Client sign-off on the hero gradient (slate → thin gold horizon).
- [ ] Re-render `streetlight-fallback.webp` and `panel-static.webp` with dusk lighting and the LED on.

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
