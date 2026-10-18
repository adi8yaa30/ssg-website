# SSG Website: Build Instructions for Claude Code

> **Project:** Demo landing page for **Shree Shyam Group (SSG)**, a unit of Shyam Infratech, Guwahati, Assam
> **Goal:** An Awwwards-level, animation-heavy, single-page home page built **pixel-faithfully** from the Figma design.
> **Read this whole file before writing any code.**

> ### ⚠️ THEME UPDATE (Oct 2026): the site is now DARK, "Blue Hour"
> The client asked for a darker website with a **pre-sunrise / post-sunset** mood. **§12 "Dark theme: Blue Hour" overrides every colour, gradient and background instruction in this file**, including the light colours shown in the Figma images. Layout, copy, assets and motion stay the same. Where a section below says "white" or "solid blue" background, use the §12 mapping instead.

---

## 0. Ground rules

1. **The Figma design is the source of truth for layout.** The full page is `assets/home-page-figma-design-image.png`, and every section folder has its own close-up `*-figma-design-image.png`. Open them and match spacing, alignment, sizes and hierarchy.
2. **This file is the source of truth for copy.** Where the design shows placeholder or outdated text, use the copy in this file (see §11, "Copy fixes vs. the Figma").
3. **Use only the assets provided** in `/assets`. Don't invent imagery. If something is missing, leave a clearly marked placeholder and list it in a `TODO.md`.
4. **Animation-heavy, but never janky.** Target 60fps, use transforms and opacity only, respect `prefers-reduced-motion`, and lazy-load heavy media.
5. **No frameworks.** Plain **HTML + CSS + JS + GSAP**. **Three.js** is allowed *only* to render the GLB (loaded via CDN import map, no build step).

---

## 1. Tech stack

| Purpose | Library (CDN via jsDelivr) |
|---|---|
| Animation | `gsap@3.13` + `ScrollTrigger`, `SplitText`, `DrawSVGPlugin`, `CustomEase` (all free since GSAP 3.13) |
| Smooth scroll | `lenis` (sync with ScrollTrigger: `lenis.on('scroll', ScrollTrigger.update)` + `gsap.ticker`) |
| 3D | `three@0.169` with `GLTFLoader` + `DRACOLoader` (or `MeshoptDecoder`) via `<script type="importmap">` |
| Fonts | Google Fonts: **Unbounded**, **Instrument Sans**, **Space Mono** |

### Suggested file structure
```
/index.html
/css/reset.css
/css/tokens.css        ← colours, type scale, spacing
/css/main.css          ← section styles
/js/main.js            ← Lenis + GSAP setup, section timelines
/js/scene.js           ← Three.js scene + GLB + panel choreography
/js/products.js        ← product slider
/js/process.js         ← diamond hover + exploded parts
/assets/...            ← copied from the provided folder (see §2)
/TODO.md               ← missing assets + things to confirm with client
```

---

## 2. Assets

Copy `/assets` into the project, and **rename folders and files to kebab-case** (no spaces, `&` or brackets) so URLs are safe, e.g. `1. Hero-Section` → `01-hero`. Keep a mapping comment in `main.js`.

**Unzip** every `.zip` in `7. SSG-Process-Section/` into its own folder before use.

| Folder | Contents | Use |
|---|---|---|
| `1. Hero-Section/` | `ssg-streetlight-realistic.glb` | The 3D hero street light (see §5) |
| | `hero-section-starting-viewport-figma-design-image.png` | **Exactly what the first screen (100vh) must look like** |
| | `hero-section-&-why-ssg-section-figma-design-image.png` | Hero + Why SSG layout |
| | `hero-section-gradient-and-viewport-inspo.mp4` | Reference for **viewport framing and gradient only** (not the GLB animation) |
| | `pole-icon.svg`, `sun-icon-svg/` | Icons in the hero callout boxes (POLE, LED HEAD) |
| | `certified-icon/`, `trusted-icon.svg`, `end-to-end-icon.svg`, `range-icon/` | Why SSG card icons (multi-file icons: combine the vectors into one inline SVG) |
| | `solar-lines-icon/` | The thin grid lines + diamond markers behind the panel (Why SSG and Powered by the Sun) |
| `2. Our-Product-Section/` | `1.`–`6.` product folders | Each has a **product photo on grass** (`N.png`, 1672×941) and a **technical blueprint** (`*copy.png`) |
| | `Our-Product-Section-Figma-Design-Image.png` | Product slide layout |
| | `batter-icon.svg`, `solar-panel-layer-icon/`, `sun-icon/` | Icons on the product slide |
| `3. Our-Mission-Section/` | `image.jpg`, `image-svg.svg` | Mission image mosaic (the SVG is the tile mask) |
| `4. National-Flag-Section/` | `national-flag.png` (transparent cut-out), `national-flag-bg-image.png` (scanline sky), `project-image.png` | Flag collage |
| `5. Powered-By-Sun-Section/` | design image only | The panel here is the **3D GLB panel** (see §5) |
| `6. Logos-Section/` | `10 copy.png` … `16 copy.png` | 7 partner logos, in order |
| `7. SSG-Process-Section/` | `site-survey.svg`, `configuration.svg`, `quality-check.svg`, `installation.svg` | Line art for the diamond's hover states |
| | `solar-panel-svg.zip`, `by-section-svg.zip` (bracket), `battery-svg.zip`, `conductor-svg.zip` (controller), `light-svg.zip`, `pole-svg.zip`, `pole-stand-svg.zip` | The 7 exploded components in a row (stroke SVGs, so they can use DrawSVG) |
| | 4 × `*-hovered-state-figma-design-image.png` | Hover state design for each quadrant |
| `8. CTA-Section/` | `CTA.svg` | Scanline product skyline |
| `9. Footer-Section/` | `footer.svg` | Scanline Northeast landscape |
| root | `logo.png` | SSG logo (nav + footer) |

### Missing assets → add to `TODO.md`
- **Semi-Integrated Street Light product photo on grass.** Folder 1 only contains the blueprint (`Untitled design (1).png`, 550×310, low-res). Use a cropped placeholder from the Figma image for now, and request a 1672×941 version matching the other 5.
- **A higher-resolution Semi-Integrated blueprint** (current one is 550px wide).

---

## 3. Design tokens

### Colours
> **Superseded by §12 (dark theme).** The original light tokens are kept below for reference only. Use the §12 tokens.

```css
/* ORIGINAL LIGHT THEME: reference only, do not use */
:root {
  --blue:        #2744DF;
  --white:       #FFFFFF;
  --sun:         #F5DB68;
  --callout:     #F5DB68;
  --ink:         #0E1424;
  --hero-gradient: linear-gradient(180deg, #FFFFFF 0%, #2744DF 100%);
}
```

### Typography
| Role | Font | Notes |
|---|---|---|
| Display / headings | **Unbounded** | Hero headline, section titles, product names, "SSG's PROCESS" (wide letter-spacing as in design) |
| Body / UI | **Instrument Sans** | **Letter-spacing: 5% (`0.05em`) everywhere this font is used** |
| Labels / specs / mono | **Space Mono** | `// LABELS`, spec lines, captions, callout text (uppercase) |

Use fluid sizing (`clamp()`), e.g. hero headline `clamp(64px, 9vw, 180px)`, line-height ~0.95.

### Buttons
Two styles exist in the design (recoloured for the dark theme, see §12):
- **Outline:** 1px border with an inner 1px offset border (double-line look). On dark: `--ice` border and text. Example: "Explore Products".
- **Solid:** `--blue` fill, `--ice` text, the same double-border look. Example: "Request a Quote". On hover, add a soft `--amber` outer glow.

Hover: the inner border slides/expands to fill, text shifts 2px, and arrow icons nudge right.

---

## 4. Global behaviour

- **Preloader:** the SSG sun logo with a battery bar filling 0 → 100% while the GLB loads (`LoadingManager.onProgress`). On complete, the bar splits and the hero reveals.
- **Nav (split nav around a centre logo, notched blue bar):** left `Home · About Us · SSG`, right `Divisions · Products · Contact Us`. Hides on scroll down and slides back on scroll up. Each link gets a sliding underline on hover.
- **Smooth scroll:** Lenis (lerp ~0.1).
- **Section reveals (default):** headings use SplitText by line, rising up with a mask (`yPercent:110 → 0`, stagger 0.08, `power4.out`). Body text fades up. Mono labels "type in" character by character.
- **Custom cursor:** a small blue dot that grows into a ring over links and buttons, and shows "View" over the process diamond and product images.
- **Reduced motion:** disable scrub and pinning, show final states, keep the GLB static.
- **Responsive:** desktop-first. On mobile (<768px), stack layouts, replace the 3D panel choreography with a simple fade (static panel PNG rendered from the GLB), and turn the products slider into a swipe carousel.

---

## 5. ⭐ THE HERO GLB + PANEL CHOREOGRAPHY (main highlight)

### 5.1 The model
`ssg-streetlight-realistic.glb` (34.6 MB, no baked animations). Node names:

| Node | Role |
|---|---|
| `Panel` | **The solar panel. This is what animates.** Origin at its centre, base rotation ≈ 15° tilt (quaternion x 0.1305) |
| `Panel frame corner fixing`, `.001`, `.002`, `.003` | 4 corner fixings. **They are separate top-level nodes**, so they must move with the panel |
| `Bracket`, `Pole`, `Arm`, `Lamp`, `LED`, `BasePlate`, `Footing`, service-hatch nodes | Static street light |
| `Ground`, `Plants`, `Individual grass blades`, `Rock_1`, `Rock_2` | Grass island |

Materials include `M_LED` (use it for the light-on glow) and `M_Cells` (panel face).

**Before using it, optimise the GLB** (34 MB is too heavy for the web):
```bash
npx @gltf-transform/cli optimize ssg-streetlight-realistic.glb ssg-streetlight.web.glb \
  --compress draco --texture-compress webp --texture-size 2048 --join false --flatten false
```
Then run `npx @gltf-transform/cli inspect` and **confirm the node names above still exist**. Target: < 6 MB.

**In code:** create a `THREE.Group` called `panelRig`, attach `Panel` and the 4 corner fixings to it (use `.attach()` to keep world transforms), and place the group's pivot at the panel's centre. Animate `panelRig` only.

### 5.2 Rendering setup
- **One `<canvas>`, `position: fixed; inset: 0; pointer-events: none;`**, a transparent renderer (`alpha: true`), ACES tone mapping, sRGB output, and an environment map (`RoomEnvironment` via PMREM) for nice metal and glass reflections.
- Soft key light from the top-left, plus a subtle rim light. Shadows: a soft contact shadow under the grass island only.
- **DOM-anchored 3D:** don't hardcode positions. Place invisible anchor `<div>`s in the HTML:
  - `#anchor-streetlight` (hero, where the light stands in the design)
  - `#anchor-panel-why` (Why SSG, where the panel image sits in the design)
  - `#anchor-panel-sun` (Powered by the Sun, where the panel image sits in the design)

  Each frame, convert the anchor's `getBoundingClientRect()` into world coordinates at the model's depth, and position the objects there. This makes the 3D objects **scroll with their sections** and stay aligned with the layout at every viewport size.
- The 2D panel images shown in the Why SSG and Powered by the Sun designs are **replaced by the 3D panel**. Keep the grid lines and diamonds (`solar-lines-icon`) as HTML/SVG behind it.

### 5.3 Layering (z-index), critical for the "from behind the flag" effect
```
z 30  National Flag section   (opaque --night background: the panel passes BEHIND it)
z 20  3D canvas (fixed)
z 10  Hero / Why SSG text, cards, callouts, all other section content
z  0  Section backgrounds (gradient, blue)
```
- Products, Mission and Logos sections sit **above the canvas** (`z 30`, opaque backgrounds), so the panel is never seen over them.
- **Powered by the Sun** has its blue background at `z 0` and its text at `z 10`, so the panel can appear inside it, while its top edge is overlapped by the National Flag section (`z 30`).

### 5.4 Scroll choreography (GSAP ScrollTrigger, `scrub: 1`)

**State A: Hero (first viewport, load-in)**
- The whole street light is anchored to `#anchor-streetlight`, matching `hero-section-starting-viewport-figma-design-image.png`.
- Load-in: the model rises 40px and fades in, then rotates slowly from -12° to 0° on Y (1.6s, `expo.out`).
- Idle: a slow ±3° Y sway that follows the cursor (lerped). The `M_LED` emissive gently pulses once.
- The callout leader lines (yellow) draw from the product out to the boxes with DrawSVG, then the boxes and text type in.

**State B: Hero → Why SSG (the panel detaches)**
1. 0–15%: `panelRig` un-clips: it lifts +0.25 units with a slight wobble (rotation z ±2°), and the corner fixings move with it.
2. 15–70%: the panel **travels down** toward `#anchor-panel-why`. During the travel it:
   - rotates from its 15° tilt to **face the camera**, ending at the slight roll shown in the design (≈ -8° on Z),
   - scales up to match the anchor's width,
   - has its cells catch a moving specular highlight (rotate the env map slightly, or move a point light across).
3. Meanwhile, **the street light (pole, lamp, island) scrolls up and away with the hero** (it follows `#anchor-streetlight`), leaving the empty bracket on top of the pole.
4. 70–100%: the panel **lands and locks** to `#anchor-panel-why` (ease `power3.out`), with a tiny settle bounce.

Pin the Why SSG section for ~150vh of scroll while the landing and card sequence play.

**State C: Why SSG sequence (while pinned)**
- Once the panel lands: the grid lines draw out from the panel, the diamonds pop in (scale 0 → 1, stagger), then **circuit lines** run from the panel to each of the 4 cards with a travelling light pulse. Each card reveals when its line reaches it (opacity, y, blur → 0). The card's icon draws itself, and its status dot lights up.
- After the pin ends, the panel **stays locked to `#anchor-panel-why`** and scrolls up with the section.

**State D: Products → Mission → National Flag**
- The panel scrolls off the top with Why SSG. Set `panelRig.visible = false` once it is fully off screen.

**State E: Powered by the Sun (the panel returns from behind the flag)**
- When the Powered by the Sun section's top reaches ~80% of the viewport: set `panelRig.visible = true` and position it at `#anchor-panel-sun` **offset upward by ~60vh**, which puts it behind the National Flag section (hidden by its higher z-index).
- On scrub, the offset animates from -60vh to 0. The panel **slides down out from under the National Flag section's bottom edge**, rotating from ~-25° to the design's resting angle (≈ +8° on Z, as in the design), and settles on `#anchor-panel-sun`.
- On landing: the grid lines draw, the diamonds pop, and the heading "POWERED BY THE SUN." splits in line by line from the right.
- After this section, the panel scrolls away with it and is hidden.

### 5.5 Performance
- Render only while the canvas has something visible (pause the render loop in States D and after E).
- `renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75))`.
- Dispose of nothing mid-scroll; load once.
- Provide a static PNG fallback of the street light (render one from the scene at load, or use the design crop) for mobile and when WebGL is unavailable.

---

## 6. Section-by-section build + copy

### 6.1 Hero (gradient wrapper starts)
**Layout:** follow the design. Headline top-left, light centre, sun semicircle + subline + CTAs top-right, two yellow callout boxes left and right with leader lines.

| Element | Copy |
|---|---|
| Headline (Unbounded, blue) | **Powering India's streets.** |
| Subline (Instrument Sans, right-aligned) | Solar street lights, high masts and public infrastructure, engineered in Guwahati since 2021. |
| CTA 1 | Explore Products → scrolls to the products section |
| CTA 2 | Partner With Us → scrolls to the CTA section |
| Callout left (`pole-icon.svg`) | `// POLE` · `5M – 30M` · `Hot-dip galvanised steel` |
| Callout right (`sun-icon-svg`) | `// LED HEAD` · `9W – 150W` · `Auto dusk-to-dawn` |

**Animations:**
- The headline reveals letter by letter with a mask (stagger 0.025), then the words shift slightly with scroll (parallax `y: -80`).
- The **sun semicircle** rises from below its baseline (clip-path reveal) and slowly bobs.
- The callouts pin to the 3D model's projected points (pole mid-height, LED head) so the leader lines stay attached while the model sways.
- On scroll: the headline moves up faster than the page (parallax), and the callouts fade out as the panel detaches.

### 6.2 Why SSG (gradient continues, pinned, see §5.4 State C)
| Element | Copy |
|---|---|
| Title (with thin lines on both sides) | **Why SSG?** |
| Card 01 (`certified-icon`) | **CERTIFIED** · **ISO 9001:2015** · Certified quality, RoHS compliant, MSME regd. |
| Card 02 (`trusted-icon.svg`) | **TRUSTED** · **Government-ready** · Associated with GeM, NRL and Rural Development. |
| Card 03 (`end-to-end-icon.svg`) | **END-TO-END** · **Plan to install** · Survey, configuration, QC and installation by one team. |
| Card 04 (`range-icon`) | **RANGE** · **One partner, every need** · Lighting, masts, flag poles, water and fitness. |

Cards: frosted glass (white 10–14%, blur 20px), 1px white-30 border with the clipped corners from the design. Hover: a 3D tilt toward the cursor (max 6°), the card's circuit line brightens, and the panel's nearest cell row glints.

### 6.3 Our Products (white, horizontal slider on continuous grass)
**Concept:** the products stand on **one continuous strip of grass**. Every product photo already includes the grass, so place the photos side by side so the grass joins seamlessly into one landscape. Scrolling or dragging moves the "camera" along the land and the next product comes into view.

**Mechanics:** pin the section and convert vertical scroll into horizontal travel (`x: -(totalWidth - vw)`, scrub). Also support drag, arrow keys, and ← → buttons. **Peek the next product** at the right edge.

**Layout per slide (from the design):**
- **Left:** product name (Unbounded, blue) → blue spec card (description + 3 spec lines in Space Mono + icons) → two mono tag lines → `Enquire Now` button
- **Centre:** product photo on grass
- **Right:** technical blueprint image (top) + an icon spec row (bottom)
- **Bottom right (add):** slide nav `←  01 / 06  →` + `Next: <product name>`

**Slide animation:** as a slide enters, the blueprint **draws in** (mask wipe top → bottom), the name splits in, the spec numbers **count up** from 0, and the spec card slides up. Stagger: name → card → tags → right column → CTA, about 80ms apart. The grass gets a subtle parallax (foreground grass moves 1.15× faster than the products).

**Slide copy:**

**01 · Semi-Integrated Street Light** (`1. Semi-Integrated-Street-Light/`)
- Card: A separate solar panel with a built-in battery. Fewer parts on the pole, less upkeep, longer life.
- Specs: `9W – 60W LED` · `6AH – 60AH BATTERY` · `50W – 160W PANEL`
- Tags: `<SEMI-INTEGRATED SOLAR STREET LIGHT>` · `TYPE MPPT // 12V / 24V SYSTEM`
- Right row: layer icon + battery icon `LiFePO4 6–60AH` · `LAYER 01: TEMPERED SOLAR GLASS` · `LAYER 02: MONOCRYSTALLINE CELLS` · `LAYER 03: BACKSHEET + ALUMINIUM FRAME`

**02 · All-in-One Solar Street Light** (`2. All-in-Solar-Street-Light/`)
- Card: Panel, battery and LED in one sleek unit. Quick to install, easy to maintain, lights itself at dusk.
- Specs: `9W – 60W LED` · `6AH – 48AH BATTERY` · `40W – 100W PANEL`
- Tags: `<ALL-IN-ONE SOLAR STREET LIGHT>` · `TYPE INTEGRATED // AUTO DUSK-TO-DAWN`
- Right row: battery icon `LiFePO4 6–48AH` · `PANEL + BATTERY + LED IN ONE UNIT` · `EASY INSTALLATION` · `LOW MAINTENANCE`

**03 · Hybrid Solar Street Light** (`3. Hybrid-Solar-Street-Light/`)
- Card: Solar by default, grid when needed. Uninterrupted light, every single night.
- Specs: `9W – 150W LED` · `6AH – 60AH BATTERY` · `40W – 165W PANEL`
- Tags: `<HYBRID SOLAR STREET LIGHT>` · `TYPE HYBRID // SOLAR + GRID`
- Right row: battery icon `LiFePO4 6–60AH` · `ALL-IN-ONE OR SEMI-INTEGRATED` · `UNINTERRUPTED NIGHT ILLUMINATION` · `ENERGY-EFFICIENT OPERATION`

**04 · AC Street Light** (`4. AC-Street-Light/`)
- Card: High-output LED lighting for busy roads and campuses, built to last outdoors.
- Specs: `12W – 250W LED` · `50,000+ HR LIFESPAN` · `IP65 WEATHERPROOF`
- Tags: `<AC LED STREET LIGHT>` · `TYPE AC // GRID-POWERED`
- Right row (sun icon instead of battery): `HIGH LUMEN OUTPUT` · `MULTIPLE WATTAGE OPTIONS` · `BUILT FOR EVERY ROAD`

**05 · Flood Light** (`5. Flood-Light/`)
- Card: Wide, bright light for grounds, yards, stadiums and open spaces.
- Specs: `9W – 350W LED` · `50,000+ HR LIFESPAN` · `IP65 WEATHERPROOF`
- Tags: `<LED FLOOD LIGHT>` · `TYPE WIDE-ANGLE // AREA LIGHTING`
- Right row (sun icon): `HIGH-LUMEN LED OUTPUT` · `WIDE-ANGLE AREA ILLUMINATION` · `IP65 WEATHERPROOF CONSTRUCTION`

**06 · High Mast & Poles** (`6. High-Mast-Pole/`)
- Card: Strong galvanised steel, from street corners to skylines. Customised to every site.
- Specs: `5M – 30M HEIGHT` · `HOT-DIP GALVANISED` · `OCTAGONAL & G.I.`
- Tags: `<HIGH MAST & LIGHTING POLES>` · `TYPE FLANGE BASE // HIGH-WIND DESIGN`
- Right row: `MATERIAL: PREMIUM MILD STEEL` · `FINISH: HOT-DIP GALVANISED` · `USE: SOLAR & STREET LIGHTING`
- Extra: a dashed dimension line beside the mast labelled `30M`

Every slide CTA: **Enquire Now** → opens the CTA/contact section with the product name pre-filled.

### 6.4 Our Mission (solid blue)
| Element | Copy |
|---|---|
| Heading (right) | **Our Mission** |
| Mission (right) | To be a trusted leader in sustainable infrastructure, delivering high-quality solutions that create long-term value for communities. |
| About (left) | Shree Shyam Group, a unit of Shyam Infratech, designs, supplies and installs sustainable infrastructure for communities, industries and government bodies across India, from solar lighting to public utilities. |
| Stat 1 | **GeM** · Associated with India's Government e-Marketplace. |
| Stat 2 | **4** · Certifications and standards: ISO 9001:2015, RoHS, MSME and product compliance. |
| Stat 3 | **100%** · Products inspected before dispatch. |

**Animation:** the image mosaic (`image.jpg` masked by `image-svg.svg` tiles) reveals **tile by tile** in a staggered grid (clip-path from the centre), with slight per-tile parallax on scroll. The "4" and "100%" count up, and "GeM" types in. Divider lines draw vertically.

### 6.5 National Flag (white, z-index 30)
| Element | Copy |
|---|---|
| Heading (top-left) | **BUILT FOR PRIDE.** |
| Body (top-right) | National Flag poles for public spaces, institutions, campuses and government buildings. Heavy-duty steel, built to carry the Tricolour high in every season. |
| Caption (under the project photo) | `// FEATURED PROJECT` · `100 FT NATIONAL FLAG MAST AT ARUNACHAL PRADESH` |
| CTA | Get a Quote |

**Composition:** `national-flag-bg-image.png` (the scanline sky) is the banner. `national-flag.png` is a separate layer **breaking out above the banner's top edge**. `project-image.png` sits bottom-left.

**Animation:**
- The banner reveals line by line from the bottom (clip-path steps), and the clouds drift ±20px on a slow loop.
- The flag rises into place (y 60 → 0) with a gentle **waving distortion** (a WebGL displacement shader on the flag image, or a CSS SVG `feTurbulence` displacement animated subtly). Keep it dignified: low amplitude, slow.
- Add a dashed dimension line beside the pole that draws upward, with a `100 FT` counter.
- The project photo slides up later than the banner, for depth.
- **Rules:** never overlay text or shapes on the flag, never distort its colours, and keep it upright and complete.

### 6.6 Powered by the Sun (solid blue, see §5.4 State E)
| Element | Copy |
|---|---|
| Heading (top-right, Unbounded, white) | **POWERED BY THE SUN.** |
| Body (left) | Every SSG solar light charges by day and lights the road all night, with no grid connection, no wiring and no electricity bills. Cleaner streets, lower running costs. |
| Mono line (add, under body) | `// ZERO GRID · ZERO BILLS · AUTO DUSK-TO-DAWN` |

### 6.7 Proudly Associated With (white)
- Title: **PROUDLY ASSOCIATED WITH**
- 7 logos in order `10`–`16`: NRL · Government of Assam · GeM · Indian Army · MPLADS · Department of Rural Development · Panchayat & Rural Development (Assam)
- **Animation:** logos fade up in a stagger. On hover, a logo scales 1.06 and the others dim to 50%. Optional: turn the row into a slow infinite marquee on screens smaller than 1200px.
- ⚠️ See §11. Logo usage must be confirmed with the client.

### 6.8 SSG's Process (solid blue)
**Layout:** `S S G ' s` (left) — **diamond** (centre) — `P R O C E S S` (right), the exploded components row below, then body text and a button.

**The diamond:** 4 rounded triangular quadrants, built as **SVG polygons** so the hover hit-areas are accurate.
| # | Label | Hover line | Line art |
|---|---|---|---|
| 01 | SITE SURVEY | Every project starts with the site: height, load and lighting needs. | `site-survey.svg` |
| 02 | CONFIGURATION | Every light is matched to the site: the right LED, battery and panel. | `configuration.svg` |
| 03 | QUALITY CHECK | Every product is inspected before it reaches your site. | `quality-check.svg` |
| 04 | INSTALLATION | Our team installs, tests and hands over on site. | `installation.svg` |

**Hover interaction (match the 4 hovered-state design images):**
1. The centre cross lines retract (250ms, `power2.inOut`).
2. The 4 quadrants merge into **2 triangles**: top and bottom (400ms, `power3.out`). A small gap remains between them, as in the design.
3. **Top triangle:** `// 0N — LABEL` + the hover line fade up, positioned in the wide lower part of the triangle.
4. **Bottom triangle:** the step's line-art SVG **wipes in** from the centre line downward (clip-path, 500ms). These SVGs are traced *filled* paths, so use a mask wipe, not DrawSVG.
5. `PROCESS` on the right swaps to the step name (ticker slide up).
6. Moving between quadrants **crossfades the content only**. Don't collapse in between.
7. On mouse leave, everything reverses.
8. Idle hint: quadrant 01 pulses softly every 4s, with the mono hint `HOVER TO EXPLORE` under the diamond.
9. **Mobile:** tap to open, or auto-cycle 01 → 04 while the section is pinned.

**Entrance:** the 4 quadrants start pulled apart toward the screen corners and **snap together** on scroll (slight overshoot). `SSG's` and `PROCESS` slide in from the sides, with letter-spacing tightening from 0.6em to the design value.

**Exploded components row:** solar panel → bracket → battery → controller → LED head → pole → pole stand.
- On scroll, the **dashed connector line draws left → right**, and each component **draws itself** (DrawSVG, stroke 0 → 100%) as the line reaches it.
- On hover over a component: it lifts 6px and a mono label appears beneath: `PANEL` · `BRACKET` · `BATTERY` · `CONTROLLER` · `LED HEAD` · `POLE` · `FLANGE BASE`.
- When the row is complete, all parts briefly slide together into a single assembled light, then slide back apart (one-time flourish).

| Element | Copy |
|---|---|
| Body | From panel wattage to battery capacity and pole height, each light is configured for the road it will stand on. |
| Button | About SSG |

### 6.9 CTA (white)
| Element | Copy |
|---|---|
| Heading | **PLANNING A PUBLIC PROJECT?** |
| Body | Panchayats, municipalities, schools and departments trust SSG to deliver lighting and infrastructure on time. |
| Button 1 | Request a Quote → contact form (modal or footer form) |
| Button 2 | Download Brochure → PDF link (placeholder `#` + TODO) |

**Visual:** `CTA.svg`, the scanline skyline of SSG products (high mast, poles and flag at the sides, dipping low in the centre).
**Animation:** the scanline rows **draw in from both outer edges toward the centre** (stagger the paths by vertical position, scaleX 0 → 1, transform-origin at the nearer edge). Then the street-light heads get a small white glow dot, one after another. Idle: a soft brightness shimmer moves across the lines. On mouse move, rows near the cursor shift ±4px horizontally (a ripple).

### 6.10 Footer (solid blue)
- **Left:** SSG logo (`logo.png`)
- **Columns:**
  - **Overview:** Home · About SSG · Products · Careers · Contact Us
  - **Socials:** Instagram · Facebook · LinkedIn · Email
- **Right white box:** a **contact card**:
  - `// GET IN TOUCH`
  - Jyotikuchi, Guwahati, Assam – 781034
  - +91 95599 93505 · +91 92071 31170
  - shyaminfratech.co.in@gmail.com
  - www.ssginfo.com
  - (Optional: an embedded map of Jyotikuchi, Guwahati)
- **Bottom illustration:** `footer.svg`, the scanline Northeast landscape (tree, hills, tea-garden rows, a small solar light).
- **Legal strip:** `© 2026 Shree Shyam Group, a unit of Shyam Infratech. All rights reserved.` · Terms · Privacy
- **Animation:** the landscape lines reveal from the bottom up, the clouds drift slowly, and the scanlines ripple near the cursor. A big **"SSG"** wordmark could rise slightly as the footer comes into view (optional).

---

## 7. Section order + background rhythm
**Dark theme (current).** Alternate between two dark tones instead of white and blue, so sections still read as distinct:

1. Hero → `--hero-gradient` (pre-sunrise, amber horizon at the bottom)
2. Why SSG → `--why-gradient` (blue hour back down to night)
3. Our Products → `--night` (`#070B1F`)
4. Our Mission → `--midnight` (`#0E1638`)
5. National Flag → `--night` (z 30, **must stay opaque**)
6. Powered by the Sun → `--sun-gradient` (the one warm section)
7. Proudly Associated With → `--midnight`
8. SSG's Process → `--night`
9. CTA → `--midnight`
10. Footer → `--night`

Section transitions: when a section enters, its top edge reveals with a slight clip-path curve (`inset(8% 0 0 0 round 40px 40px 0 0)` → `inset(0)`), so sections feel stacked like cards.

---

## 8. Motion language (keep it consistent)
- Default ease: `power3.out`; hero and big moves: `expo.out`; scrubbed: `none` with `scrub: 1`
- Durations: micro 0.25s · UI 0.4–0.6s · reveals 0.8–1.2s
- Stagger: text 0.04–0.08 · cards 0.1
- **Line-drawing is the signature motion** (callout leaders, grid lines, circuit lines, exploded parts, dimension lines). Use it everywhere it fits.
- **Scanlines are the signature texture** (flag sky, CTA skyline, footer). Animate them by rows.

---

## 9. Accessibility & SEO
- Semantic sections with `aria-labelledby`. The canvas gets `aria-hidden="true"`, and a hidden text alternative describes the product.
- All buttons are keyboard focusable, with visible focus rings (2px `--sun` outline).
- Process diamond quadrants are focusable (`tabindex="0"`), and Enter/Space opens them.
- Alt text on every image, e.g. "Semi-integrated solar street light by SSG".
- `<title>`: **SSG | Solar Street Lights & Public Infrastructure, Guwahati**
- Meta description: *Shree Shyam Group supplies and installs solar street lights, high masts, flag poles and public infrastructure across the Northeast. ISO 9001:2015 certified.*

---

## 10. Build order (do it in this sequence)
1. Project setup: fonts, tokens, Lenis + GSAP, empty sections with correct backgrounds and z-index layers.
2. Static layout of every section matching the Figma (no animation yet). **Check each one against its design image.**
3. Three.js scene: load the optimised GLB, the `panelRig`, DOM anchors, and the static hero.
4. Panel choreography (§5.4), States A → E. Test at 1280, 1440, 1728 and 1920px widths.
5. Section animations (§6), one by one.
6. Products slider.
7. Process diamond + exploded row.
8. CTA and footer scanline animations.
9. Preloader, cursor, nav behaviour.
10. Mobile and reduced-motion fallbacks, performance pass (Lighthouse ≥ 85 desktop), `TODO.md`.

---

## 11. Copy fixes vs. the Figma + things to confirm

**Fix these in the build (the design has placeholders or typos):**
| In the Figma | Use instead |
|---|---|
| Hero subline ends with "CTAs (below the subline)" | Remove it (placeholder text) |
| Nav "Divisons" | **Divisions** |
| Why SSG card 03: "Design to install / Fabrication, QC and installation by one team." | **Plan to install** / Survey, configuration, QC and installation by one team. |
| Product slide: "ALMINIUM FRAME" | **ALUMINIUM FRAME** |
| CTA: "PLANNING A PUBLIC POJECT?" | **PLANNING A PUBLIC PROJECT?** |
| Mission about text: "designs, manufactures and installs" | **designs, supplies and installs** (SSG does not fabricate) |

**Add to `TODO.md`, to confirm with the client before going live:**
- Permission to display the **Government of Assam emblem**, **Indian Army emblem** and other government seals. State emblem usage is legally restricted.
- That SSG is actually listed on **GeM**, and the "4 certifications" and "100% inspected" claims.
- The "Panchayats, municipalities, schools and departments" client claim in the CTA.
- The pole height range: the brochure says both **3–12m** and **5–30m (customised)**.
- The featured flag project location (**Arunachal Pradesh**) and its height (100 ft).
- The correct brand name spelling: **Shree** vs **Sri** Shyam Group (the brochure uses both).
- Social media URLs, brochure PDF, and careers page link.
- The missing Semi-Integrated product photo (see §2).

---

## 12. Dark theme: "Blue Hour" (overrides all colour guidance above)

### 12.1 Concept
The client asked for a darker site with a **pre-sunrise / post-sunset** mood. The whole page lives in the minutes just before sunrise and just after sunset: a deep navy sky, a thin amber glow on the horizon, and **street lights switched on**. This is **one consistent mood**, not a day-to-night scroll story. The sky does **not** change as you scroll.

Mood reference: `PHOTO-2026-10-12-22-23-23.jpg` in the repo root (solar panels at golden hour over misty hills, with glowing amber light streaks). Take the colour and the light streaks from it. Don't use the photo itself on the site unless asked.

Layout, copy, assets and motion from §0–§11 all stay. **Only colours, lighting and some image treatments change.**

### 12.2 Tokens (replace the colour block in `css/tokens.css`)
```css
:root {
  /* Base */
  --night:      #070B1F;   /* main page background */
  --midnight:   #0E1638;   /* alternate sections, cards, panels */
  --bluehour:   #1A2A6C;   /* lifted surfaces, gradient mid-tones */
  --blue:       #2744DF;   /* brand accent: lines, buttons, icons, fills (NOT body text) */

  /* Light */
  --amber:      #F5A524;   /* horizon glow, light pulses, lamp glow, hover glows */
  --ember:      #E8743B;   /* warm edge, used sparingly (horizon base only) */
  --sun:        #F5DB68;   /* hero sun semicircle (unchanged) */
  --callout:    #F5DB68;   /* hero callout outline + leader lines (unchanged) */

  /* Text */
  --ice:        #EEF1FF;   /* primary text on dark */
  --ice-muted:  #9AA6D6;   /* secondary text, mono labels */

  /* Lines & glass */
  --ice-30:     rgba(238, 241, 255, .30);  /* grid lines, card borders */
  --ice-10:     rgba(238, 241, 255, .10);  /* glass card fill */
  --amber-glow: 0 0 24px rgba(245, 165, 36, .45);

  /* Gradients */
  --hero-gradient: linear-gradient(180deg,
      #070B1F 0%, #0E1638 45%, #1A2A6C 72%, #2744DF 86%, #F5A524 94%, #E8743B 100%);
  --why-gradient:  linear-gradient(180deg, #1A2A6C 0%, #070B1F 100%);
  --sun-gradient:  linear-gradient(180deg, #0E1638 0%, #1A2A6C 55%, #2744DF 80%, #F5A524 100%);
}
```

**Hero gradient (Figma stops, Linear, top → bottom):**
| Stop | Colour |
|---|---|
| 0% | `#070B1F` |
| 45% | `#0E1638` |
| 72% | `#1A2A6C` |
| 86% | `#2744DF` |
| 94% | `#F5A524` |
| 100% | `#E8743B` |

- **This is a change from §3:** the hero and Why SSG are **no longer one shared gradient**. The hero gets `--hero-gradient` on its own, so the **amber horizon sits directly behind the grass island**. Why SSG then continues with `--why-gradient` (blue hour fading back to night). The join between them must be seamless: the hero ends warm, so overlap a ~120px soft fade from `#E8743B` into `#1A2A6C` at the top of Why SSG.
- Keep the amber band **thin**. If it reads too wide, move the `#F5A524` stop to 96%.
- **Fallback (if the client finds the orange too strong):** use `linear-gradient(180deg, #070B1F 0%, #0E1638 55%, #1A2A6C 85%, #2744DF 100%)` for the hero. Build this as a one-line token swap.

### 12.3 Contrast rules
- **Never set body text in `--blue` on dark backgrounds.** It fails WCAG contrast. Text is `--ice` or `--ice-muted`. `--blue` is for lines, buttons, fills and icons.
- Headings that were blue in the Figma become `--ice`. Use `--blue` or `--amber` only for small accents (an underline, one highlighted word).
- Check every text/background pair is at least **4.5:1** (body) or **3:1** (large headings).

### 12.4 Signature element: the amber light line
Taken from the light streaks in the reference photo: a **thin glowing amber line** (1–1.5px `--amber` + `--amber-glow`). Use it for:
- the hero callout leader lines (they can stay `--callout` yellow, or switch to amber; pick one and apply it everywhere),
- the Why SSG circuit lines and the **light pulses** that travel along them,
- the dashed connector in the Process exploded row,
- thin section dividers where sections meet.

### 12.5 The 3D street light at night (`js/scene.js`)
This is the biggest visual win of the dark theme. **The light is ON.**
- **LED on:** set `M_LED` emissive to a warm white (`#FFE7B0`), `emissiveIntensity` ≈ 3–4, and add a **soft cone of light** onto the grass. Use a `SpotLight` from the lamp head pointing down, warm colour, with a soft penumbra. Add a subtle bloom (`UnrealBloomPass`, low strength ~0.6, threshold ~0.85) so only the LED glows.
- **Night lighting:** replace the daylight key light with a **cool moonlight key** (`#9FB4FF`, low intensity) from the top-left, plus a **warm rim light** (`--amber`) from low behind the model, to echo the horizon glow. Lower the environment map intensity to ~0.4 so metal reflects the dark sky, not a bright studio.
- **Load-in:** the LED **flickers on** (2 quick blinks, then steady) as the model finishes rising. Turn the LED on before the panel detaches.
- **Panel:** the cells (`M_Cells`) catch a **warm amber specular sweep** as the panel travels (§5.4 State B), like the first sun hitting the glass.
- **Powered by the Sun (§5.4 State E):** as the panel lands, a warm light from below brightens it slightly, so the panel "catches first light" against `--sun-gradient`.
- Re-render the fallbacks (`streetlight-fallback.webp`, `panel-static.webp`) with the night lighting and the LED on.

### 12.6 Section-by-section changes
| Section | Background | Changes |
|---|---|---|
| **Hero** | `--hero-gradient` | Headline in `--ice`. Subline in `--ice-muted`. The **sun semicircle** sits low, like a dawn sun just cresting the horizon, with a soft `--amber` glow around it. The callout boxes keep their yellow outline, with `--ice` text on a `--ice-10` glass fill. The background grid lines and diamonds use `--ice-30`. |
| **Why SSG** | `--why-gradient` | Dark glass cards (`--ice-10` fill, `--ice-30` border, blur 20px). The circuit lines and pulses are **amber** (§12.4). Card titles in `--ice`, body in `--ice-muted`. Icons in `--ice`, turning `--amber` when their pulse arrives. |
| **Our Products** | `--night` | Product name in `--ice`. Spec card in `--midnight` with an `--ice-30` border (it was solid blue). Mono tags in `--ice-muted`. **Blueprints:** invert them to ice lines on a transparent background (CSS `filter: invert(1) hue-rotate(180deg)` plus `mix-blend-mode: screen`, or re-export them). **Product photos: see §12.7.** |
| **Our Mission** | `--midnight` | Text in `--ice`. Stats: numbers in `--ice`, dividers in `--ice-30`. **Mosaic photos:** apply a blue-hour grade (§12.7). |
| **National Flag** | `--night` (opaque, z 30) | "BUILT FOR PRIDE." in `--ice`. **Scanline sky:** recolour to `--bluehour` lines on `--night`, with clouds near the horizon tinted `--amber` at low opacity. **The flag stays in true colours, never tinted**, with a soft warm uplight glow behind it. The project photo gets the §12.7 grade, but the flag in it stays true colour. |
| **Powered by the Sun** | `--sun-gradient` | The **one warm section**. The heading in `--ice` sits on the amber end, so check contrast; move the heading up into the blue part if needed. Grid lines in `--ice-30`. |
| **Proudly Associated With** | `--midnight` | Place each logo on a **small ice-white chip** (`#EEF1FF`, radius 12px, padding 16px). Most logos have coloured or white backgrounds, and government seals **must not be recoloured or inverted**. |
| **SSG's Process** | `--night` | Diamond quadrants in `--midnight` with `--ice-30` borders. Labels in `--ice`. Hover: the active half fills `--bluehour`. The **hover line-art SVGs** (filled `#2744DF` traces on a white rect): remove the white background rect and recolour the fill to `--ice`. The exploded parts are already white strokes; keep them and make the dashed connector `--amber`. |
| **CTA** | `--midnight` | Heading in `--ice`. **Scanline skyline:** lines in `--bluehour` → `--blue`, and every lamp head gets a **glowing `--amber` dot**, so the skyline is lit at night. This is the closing image, so make the glow obvious. Buttons per §3 (dark variants). |
| **Footer** | `--night` | **Scanline landscape:** `--bluehour` lines on `--night`, with a faint `--amber` horizon line and the small solar light glowing. The contact card becomes `--midnight` with `--ice` text (it was white). Links in `--ice-muted`, `--ice` on hover. |
| **Nav** | `--night` at 80% + blur | The notched bar becomes `--midnight` with an `--ice-30` hairline. Links in `--ice-muted`, `--ice` on hover/active. |
| **Preloader** | `--night` | The battery bar fills with `--amber`. |
| **Cursor** | — | `--ice` dot. The ring glows `--amber` over buttons. |

### 12.7 Image treatments (assets made for the light theme)
1. **Product photos (`02-products/*/photo.webp`):** they have white backgrounds and **daytime grass**, so they'll look pasted on.
   - **Preferred:** regenerate all six at dusk using the same continuous-grass composition, with the prompt addition *"blue hour just after sunset, deep navy sky, the LED lamp switched on with a warm glow on the grass, soft amber horizon glow, no white background"*. Add this to `TODO.md` as a client and design task.
   - **Interim:** cut out the white background (the products and grass to transparent), place them on `--night`, and grade them: CSS `filter: brightness(.72) saturate(.85)` plus a `--bluehour` overlay at 25% in `color` blend mode. Then add a **warm glow at each lamp head** (a radial-gradient `--amber` div, 30% opacity, blurred).
2. **Mission mosaic (`image.jpg`) and the flag project photo:** daytime shots. Grade them with a `--bluehour` overlay (`soft-light`, ~40%) and `brightness(.8)`. Request dusk versions as a TODO.
3. **Scanline SVGs (CTA, footer, flag sky):** recolour through CSS variables or `fill` rewrites in `tools/optimize-svg.py`. Don't edit the source exports in `/assets`.
4. **Blueprints:** invert as described in §12.6.

### 12.8 Implementation notes
- Do this on a **separate branch** (e.g. `dark-theme`). `main` auto-deploys to GitHub Pages, so only merge after the client approves the preview.
- Almost all changes go through `css/tokens.css`. Search `main.css` for hard-coded `#fff`, `#FFFFFF`, `white`, `#2744DF` and `rgba(255,255,255…)` and replace them with tokens.
- Update the scanline colours in `js/scanlines.js` and `js/flag.js` if they set colours in JS.
- Re-run `tools/embed-local-assets.py` after changing any embedded SVG or the GLB fallbacks.
- **Reduced motion:** the LED is simply on (no flicker), and the light pulses are static amber lines.
- After the swap, run a full contrast pass (§12.3) and compare each section against the Figma for layout. The colours will intentionally differ.
