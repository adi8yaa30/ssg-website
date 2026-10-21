(function () {
/* ==========================================================================
   SSG's Process: the diamond and the exploded components row.

   The diamond is drawn from one state value t (0 = four quadrants, 1 = two
   triangles). Every frame the quadrant outlines are rebuilt from t: the
   vertical gap closes, the horizontal gap opens, the inner corners square off
   and each half-tip melts into one round apex. Open and close are a single
   tween on t, so they can never fight each other. The bottom clip path is
   rebuilt from the same geometry, so the line art always sits exactly inside
   the visible triangle.
   ========================================================================== */
// fit: drawn width and sideways shift inside the bottom triangle, chosen per drawing so the
// main subject sits inside the triangle (it narrows to a point, so wide scenes are drawn smaller)
const STEPS = [
  { label: 'SITE SURVEY', line: 'Every project starts with the site: height, load and lighting needs.', art: 'site-survey', fit: { w: 240, dx: 22 } },
  { label: 'CONFIGURATION', line: 'Every light is matched to the site: the right LED, battery and panel.', art: 'configuration', fit: { w: 255, dx: 0 } },
  { label: 'QUALITY CHECK', line: 'Every product is inspected before it reaches your site.', art: 'quality-check', fit: { w: 250, dx: 0 } },
  { label: 'INSTALLATION', line: 'Our team installs, tests and hands over on site.', art: 'installation', fit: { w: 215, dx: 0 } },
];

// ---- Scene loops: small moments that play on repeat while a step is open ----
// Coordinates are in each drawing's own viewBox units.
const css = getComputedStyle(document.documentElement);
const SUN = css.getPropertyValue('--gold').trim() || '#E9A94A';
const glow = (parent, x, y, r) => el('circle', { cx: x, cy: y, r, fill: 'url(#diamond-glow)', opacity: 0 }, parent);
const SCENES = [
  // 01 site survey: the total station's beam sweeps to the planned pole, which glows into place
  (g, gsap) => {
    const beam = el('line', { x1: 262, y1: 452, x2: 880, y2: 817, stroke: SUN, 'stroke-width': 7, 'stroke-dasharray': '22 16', 'stroke-linecap': 'round', opacity: 0 }, g);
    const spot = glow(g, 880, 817, 70);
    const heads = [glow(g, 963, 266, 95), glow(g, 1146, 475, 60)];
    return gsap.timeline({ repeat: -1, repeatDelay: 0.4, paused: true })
      .fromTo(beam, { opacity: 0, strokeDashoffset: 0 }, { opacity: 1, duration: 0.4 }, 0)
      .to(beam, { strokeDashoffset: -228, duration: 2.4, ease: 'none' }, 0)
      .to(spot, { opacity: 1, duration: 0.4, ease: 'power2.out' }, 0.5)
      .to(heads, { opacity: 0.95, duration: 0.5, stagger: 0.35, ease: 'power2.out' }, 0.9)
      .to([beam, spot, ...heads], { opacity: 0, duration: 0.5, ease: 'power1.in' }, 2.6);
  },
  // 02 configuration: the tablet and the board step through LED -> battery -> panel
  (g, gsap) => {
    const card = (x, y, w, h) => el('rect', { x: x - w / 2, y: y - h / 2, width: w, height: h, rx: 8, fill: SUN, opacity: 0 }, g);
    const picks = [[890, 946, 1007], [623, 713, 797]];
    const tablet = picks[0].map((x) => card(x, 591, 52, 140));
    const board = picks[1].map((x) => card(x, 188, 80, 62));
    const tl = gsap.timeline({ repeat: -1, paused: true });
    [0, 1, 2].forEach((k) => {
      tl.to([tablet[k], board[k]], { opacity: 0.75, duration: 0.3, ease: 'power2.out' }, k * 1.1)
        .to([tablet[k], board[k]], { opacity: 0, duration: 0.3, ease: 'power2.in' }, k * 1.1 + 0.85);
    });
    return tl;
  },
  // 03 quality check: the light under test flickers on, then the shield lights up (passed)
  (g, gsap) => {
    const lamp = glow(g, 269, 439, 190);
    const shield = glow(g, 914, 269, 120);
    return gsap.timeline({ repeat: -1, repeatDelay: 0.5, paused: true })
      .to(lamp, { keyframes: [{ opacity: 0.9, duration: 0.08 }, { opacity: 0.15, duration: 0.1 }, { opacity: 0.85, duration: 0.08 }, { opacity: 0.3, duration: 0.14 }, { opacity: 1, duration: 0.25 }] }, 0)
      .to(shield, { opacity: 0.9, duration: 0.45, ease: 'power2.out' }, 1.3)
      .to([lamp, shield], { opacity: 0, duration: 0.6, ease: 'power1.in' }, 2.9);
  },
  // 04 installation: the new light comes on, then the lights down the road follow one by one
  (g, gsap) => {
    const main = glow(g, 949, 125, 120);
    const road = [[1218, 462, 62], [1105, 555, 48], [1034, 602, 38], [989, 632, 30], [953, 648, 25], [928, 663, 21]].map(([x, y, r]) => glow(g, x, y, r));
    return gsap.timeline({ repeat: -1, repeatDelay: 0.4, paused: true })
      .to(main, { keyframes: [{ opacity: 0.8, duration: 0.1 }, { opacity: 0.2, duration: 0.1 }, { opacity: 1, duration: 0.35 }] }, 0)
      .to(road, { opacity: 0.95, duration: 0.3, stagger: 0.16, ease: 'power2.out' }, 0.7)
      .to([main, ...road], { opacity: 0, duration: 0.6, ease: 'power1.in' }, 2.8);
  },
];

const NS = 'http://www.w3.org/2000/svg';
const C = 230;            // diamond centre in the 460 viewBox
const K = C + 7;          // outer edges: x + y = K (top-left edge), mirrored for the others
const R = 12;             // outer corner radius (12px in the design)
const R_IN = 4;           // inner (centre) corner radius of a quadrant
const GAP = 2;            // half gap between quadrants
const GAP_OPEN = 4.3;     // half gap between the two triangles
const OVERLAP = 0.6;
const HIT_DEAD = 40;       // half-size of the centre zone that hovers no quadrant      // halves overlap a hair when merged so no seam shows
const SQ2 = Math.SQRT2;
const TAN_22 = Math.tan(Math.PI / 8);

// Top-left quadrant outline for a given state, as [cmd, ...] segments.
// gv: half vertical gap, gh: half horizontal gap, s: 1 = own rounded tip, 0 = half of a shared apex
function quadSegments(gv, gh, s, ri) {
  const xs = C - gv;      // the vertical seam
  const yb = C - gh;      // the horizontal seam
  // tip: a circle of radius R tangent to the outer edge, slid from "tangent to the seam" (s=1)
  // to "centred on the seam" (s=0); the outline follows it up to where it crosses the seam
  const cx = xs - R * s;
  const cy = K + R * SQ2 - cx;
  const dx = xs - cx;
  const tipEdge = [cx - R / SQ2, cy - R / SQ2];
  const tipSeam = [xs, cy - Math.sqrt(Math.max(0, R * R - dx * dx))];
  // outer side corner (45°): tangent distance for a true radius-R arc
  const d = R / TAN_22;
  const vx = K - yb;
  return [
    ['M', tipEdge], ['A', R, tipSeam],
    ['L', [xs, yb - ri]], ['A', ri, [xs - ri, yb]],
    ['L', [vx + d, yb]], ['A', R, [vx + d / SQ2, yb - d / SQ2]],
    ['Z'],
  ];
}

// mirror the top-left outline into any quadrant (0 TL, 1 TR, 2 BL, 3 BR)
function toPath(segs, q) {
  const mx = q === 1 || q === 3;
  const my = q === 2 || q === 3;
  const sweep = mx !== my ? 0 : 1;
  const P = ([x, y]) => `${(mx ? 2 * C - x : x).toFixed(2)} ${(my ? 2 * C - y : y).toFixed(2)}`;
  return segs.map(([c, a, b]) => {
    if (c === 'M' || c === 'L') return c + P(a);
    if (c === 'A') return `A${a.toFixed(2)} ${a.toFixed(2)} 0 0 ${sweep} ${P(b)}`;
    return 'Z';
  }).join('');
}

function el(tag, attrs = {}, parent) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}

const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => Math.max(0, Math.min(1, v));

function initProcess({ gsap, ScrollTrigger, reduced, touch, whileVisible = (el, a) => a }) {
  const section = document.querySelector('.process');
  if (!section) return;
  const diamond = section.querySelector('.diamond');
  const svg = diamond.querySelector('.diamond__svg');
  const quadsG = svg.querySelector('.diamond__quads');
  const labelsG = svg.querySelector('.diamond__labels');
  const clips = [...svg.querySelectorAll('.diamond__clip')];
  const artwrap = svg.querySelector('.diamond__artwrap');
  const hits = diamond.querySelector('.diamond__hits');
  const lineEl = diamond.querySelector('.diamond__line');
  const ticker = section.querySelector('.ticker');
  const hint = section.querySelector('.process__hint');
  const D = reduced ? 0 : 1;

  // shared defs: a soft sun glow for the scene moments
  const defs = svg.querySelector('defs');
  const grad = el('radialGradient', { id: 'diamond-glow' }, defs);
  el('stop', { offset: '0', 'stop-color': SUN, 'stop-opacity': 0.95 }, grad);
  el('stop', { offset: '0.55', 'stop-color': SUN, 'stop-opacity': 0.35 }, grad);
  el('stop', { offset: '1', 'stop-color': SUN, 'stop-opacity': 0 }, grad);

  // ---- Shapes -----------------------------------------------------------------
  const quadPaths = [0, 1, 2, 3].map(() => el('path', {}, quadsG));
  const state = { t: 0 };
  function render() {
    const t = state.t;
    const segs = quadSegments(lerp(GAP, -OVERLAP, t), lerp(GAP, GAP_OPEN, t), 1 - t, lerp(R_IN, 0, t));
    quadPaths.forEach((p, q) => p.setAttribute('d', toPath(segs, q)));
    clips[0].setAttribute('d', toPath(segs, 2));
    clips[1].setAttribute('d', toPath(segs, 3));
    labelsG.style.opacity = clamp01(1 - t * 2.5);
  }
  render();

  // idle pulse halo for quadrant 01
  const halo = el('path', { d: quadPaths[0].getAttribute('d'), fill: 'none', stroke: SUN, 'stroke-width': 2, opacity: 0, class: 'diamond__halo' });
  quadsG.parentNode.insertBefore(halo, quadsG);

  // rotated labels + numbers
  const labels = [
    { t: STEPS[0].label, x: 80, y: 177, rot: -45 }, { t: STEPS[1].label, x: 372, y: 169, rot: 45 },
    { t: STEPS[2].label, x: 86, y: 290, rot: 45 }, { t: STEPS[3].label, x: 378, y: 285, rot: -45 },
  ].map((l) => {
    const t = el('text', { x: l.x, y: l.y, 'text-anchor': 'middle', 'dominant-baseline': 'middle', transform: `rotate(${l.rot} ${l.x} ${l.y})` }, labelsG);
    t.textContent = l.t;
    return t;
  });
  const nums = [['01.', 223, 210, 'end'], ['02.', 237, 210, 'start'], ['03.', 223, 254, 'end'], ['04.', 237, 254, 'start']].map(([s, x, y, a]) => {
    const t = el('text', { x, y, 'text-anchor': a, class: 'num' }, labelsG);
    t.textContent = s;
    return t;
  });

  // ticker items
  STEPS.forEach((s) => {
    const span = document.createElement('span');
    span.className = 'ticker__item';
    span.textContent = s.label;
    ticker.appendChild(span);
  });
  const tickerItems = [...ticker.children];
  gsap.set(tickerItems.slice(1), { yPercent: 100, autoAlpha: 0 });
  let activeTicker = tickerItems[0];
  let tickerTransition;

  // focusable hit areas: the plain quadrants with no gap, minus a small diamond at the
  // centre so the middle hovers nothing. [sx, sy] is each quadrant's direction from C.
  const hitPaths = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy]) => [
    [C, C + sy * (C - 7)], [C, C + sy * HIT_DEAD], [C + sx * HIT_DEAD, C], [C + sx * (C - 7), C],
  ]).map((pts, i) => el('path', {
    d: `M${pts.map((pt) => pt.join(' ')).join('L')}Z`,
    tabindex: 0, role: 'button', 'aria-label': `0${i + 1}: ${STEPS[i].label}. ${STEPS[i].line}`,
  }, hits));

  // ---- Line art: inlined so every stroke can be animated ----------------------
  const ART_TOP = C + GAP_OPEN + 4;         // just under the top edge of the bottom triangle
  const artGroups = STEPS.map(() => el('g', { class: 'diamond__art', opacity: 0 }, artwrap));
  // movers carry the slow camera drift, separate from the entrance tween on artGroups
  const movers = artGroups.map((g) => el('g', {}, g));
  const artPaths = STEPS.map(() => []);
  const scenes = STEPS.map(() => null);
  const drifts = STEPS.map(() => null);
  let artsReady;
  function loadArts() {
    artsReady ||= Promise.all(STEPS.map(async (s, i) => {
      const res = await fetch(`assets/07-process/${s.art}.svg`);
      const doc = new DOMParser().parseFromString(await res.text(), 'image/svg+xml');
      const art = doc.getElementById('lineart');   // skips the file's white background rect
      if (!art) return;
      const node = document.importNode(art, true);
      node.removeAttribute('id');
      movers[i].appendChild(node);
      const bb = node.getBBox();
      const { w, dx } = s.fit;
      const k = w / bb.width;
      node.setAttribute('transform', `translate(${(C - w / 2 + dx - bb.x * k).toFixed(2)} ${(ART_TOP - bb.y * k).toFixed(2)}) scale(${k.toFixed(5)})`);
      if (!reduced) {
        // the scene's moment sits under the line work
        const under = el('g', {});
        node.insertBefore(under, node.firstChild);
        scenes[i] = SCENES[i](under, gsap);
        drifts[i] = gsap.fromTo(movers[i], { scale: 1, x: 0, y: 0 }, {
          scale: 1.05, x: -5, y: -2, svgOrigin: `${C} ${ART_TOP + 60}`,
          duration: 6, ease: 'sine.inOut', yoyo: true, repeat: -1, paused: true,
        });
      }
      // strokes sorted top to bottom, so the drawing sketches itself downwards
      artPaths[i] = [...node.querySelectorAll('path')]
        .map((p) => ({ p, y: p.getBBox().y }))
        .sort((a, b) => a.y - b.y)
        .map((o) => o.p);
    })).catch(() => {});
    return artsReady;
  }
  ScrollTrigger.create({ trigger: section, start: 'top bottom+=800', once: true, onEnter: loadArts });

  // ---- Interaction --------------------------------------------------------------
  let open = false;
  let current = -1;
  let shown = -1;

  function setTicker(i) {
    const target = i < 0 ? tickerItems[0] : tickerItems[i + 1];
    if (target === activeTicker) return;
    tickerTransition?.kill();
    const previous = activeTicker;
    const previousY = Number(gsap.getProperty(previous, 'yPercent')) || 0;
    // Reversing an interrupted change should bring the outgoing row back from
    // its current side, without restarting it at the bottom of the mask.
    const backwards = Number(gsap.getProperty(target, 'opacity')) > 0 &&
      Number(gsap.getProperty(target, 'yPercent')) < previousY;
    const direction = backwards ? -1 : 1;
    activeTicker = target;
    tickerItems.forEach((item) => {
      item.classList.toggle('is-active', item === target);
      if (item !== target && item !== previous) gsap.set(item, { yPercent: 100, autoAlpha: 0 });
    });
    if (reduced) {
      gsap.set(previous, { yPercent: 100, autoAlpha: 0 });
      gsap.set(target, { yPercent: 0, autoAlpha: 1 });
      return;
    }
    gsap.set(previous, { autoAlpha: 1 });
    gsap.set(target, { yPercent: previousY + direction * 100, autoAlpha: 1 });
    // The two equal-height rows stay exactly one row apart throughout the
    // tween. One timeline also prevents stale outgoing tweens on rapid hover.
    tickerTransition = gsap.timeline({
      defaults: { duration: 0.45 },
      onComplete: () => gsap.set(previous, { yPercent: 100, autoAlpha: 0 }),
    })
      .to(previous, { yPercent: -direction * 100 }, 0)
      .to(target, { yPercent: 0 }, 0);
  }

  function showText(i, delay) {
    gsap.killTweensOf(lineEl);
    gsap.to(lineEl, {
      opacity: 0, duration: 0.12 * D, onComplete: () => {
        lineEl.innerHTML = STEPS[i].line.split(' ').map((w) => `<span class="w">${w}</span>`).join(' ');
        gsap.set(lineEl, { opacity: 1 });
        gsap.from(lineEl.children, { yPercent: 70, opacity: 0, duration: 0.5 * D, stagger: 0.03 * D, delay: delay * D });
      },
    });
  }

  function showArt(i, delay) {
    loadArts().then(() => {
      if (current !== i) return;
      if (shown >= 0 && shown !== i) {
        const prev = artGroups[shown];
        gsap.to(prev, { opacity: 0, y: 8, duration: 0.25 * D, overwrite: true });
      }
      shown = i;
      playLoops(i, delay);
      const g = artGroups[i];
      gsap.fromTo(g, { opacity: 1, y: -6, scale: 1.06, transformOrigin: '50% 0%' }, { y: 0, scale: 1, duration: 1.1 * D, delay: delay * D, overwrite: true });
      // the drawing sketches in from the top edge down
      gsap.killTweensOf(artPaths[i]);
      gsap.fromTo(artPaths[i], { opacity: 0 }, { opacity: 1, duration: 0.35 * D, stagger: { amount: 0.6 * D }, delay: delay * D });
    });
  }

  // ---- Constant motion while a step is open: scene moment + slow camera drift
  let loopsOff;
  function playLoops(i, delay) {
    if (reduced) return;
    loopsOff?.kill();
    scenes.forEach((tl, k) => { if (k !== i) tl?.pause(0); });
    drifts.forEach((tw, k) => { if (k !== i) tw?.pause(); });
    scenes[i]?.delay(0.9 + delay).restart(true);
    drifts[i]?.restart();
  }
  function stopLoops() {
    if (reduced) return;
    // after the art has faded out
    loopsOff = gsap.delayedCall(0.3, () => {
      scenes.forEach((tl) => tl?.pause(0));
      drifts.forEach((tw) => tw?.pause());
    });
  }

  function openStep(i) {
    if (i === current) return;
    halo.style.display = 'none';
    const first = !open;
    open = true;
    current = i;
    diamond.classList.add('is-open');
    gsap.to(state, { t: 1, duration: 0.55 * D, onUpdate: render, overwrite: true });
    showText(i, first ? 0.3 : 0);
    showArt(i, first ? 0.25 : 0.05);
    setTicker(i);
  }

  function close() {
    if (!open) return;
    open = false;
    current = -1;
    diamond.classList.remove('is-open');
    gsap.killTweensOf(lineEl);
    gsap.to(lineEl, { opacity: 0, duration: 0.2 * D });
    if (shown >= 0) gsap.to(artGroups[shown], { opacity: 0, duration: 0.25 * D, overwrite: true });
    shown = -1;
    stopLoops();
    gsap.to(state, {
      t: 0, duration: 0.5 * D, delay: 0.05 * D, onUpdate: render, overwrite: true,
      onComplete: () => { halo.style.display = ''; },
    });
    setTicker(-1);
  }

  // close only once the pointer has really left the diamond (not when crossing a seam)
  let closeTimer;
  const cancelClose = () => clearTimeout(closeTimer);
  const queueClose = () => { cancelClose(); closeTimer = setTimeout(close, 90); };
  hitPaths.forEach((p, i) => {
    p.addEventListener('mouseenter', () => { cancelClose(); openStep(i); });
    p.addEventListener('mouseleave', queueClose);
    p.addEventListener('focus', () => { cancelClose(); openStep(i); });
    p.addEventListener('click', () => (current === i && touch ? close() : openStep(i)));
    p.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); current === i ? close() : openStep(i); }
      if (e.key === 'Escape') close();
    });
  });
  hits.addEventListener('focusout', (e) => { if (!hits.contains(e.relatedTarget)) queueClose(); });

  // the art drifts gently against the pointer while a step is open
  if (!reduced && !touch) {
    const ax = gsap.quickTo(artwrap, 'x', { duration: 0.8, ease: 'power3.out' });
    const ay = gsap.quickTo(artwrap, 'y', { duration: 0.8, ease: 'power3.out' });
    diamond.addEventListener('pointermove', (e) => {
      const r = diamond.getBoundingClientRect();
      ax(-((e.clientX - r.left) / r.width - 0.5) * 14);
      ay(-((e.clientY - r.top) / r.height - 0.5) * 8);
    });
    diamond.addEventListener('pointerleave', () => { ax(0); ay(0); });
  }

  // idle hint: quadrant 01 pulses every 4 s (only while the diamond is on screen)
  if (!reduced) {
    whileVisible(diamond, gsap.timeline({ repeat: -1, repeatDelay: 2.6, delay: 3 })
      .fromTo(halo, { opacity: 0.7, scale: 1, transformOrigin: '75% 75%' }, { opacity: 0, scale: 1.08, duration: 1.4, ease: 'power2.out' }));
  }

  // mobile: auto-cycle 01 -> 04 while the section is on screen
  if (touch && !reduced) {
    let idx = 0;
    let timer;
    ScrollTrigger.create({
      trigger: diamond, start: 'top 70%', end: 'bottom 20%',
      onToggle: (self) => {
        clearInterval(timer);
        if (self.isActive) {
          openStep(idx);
          timer = setInterval(() => { idx = (idx + 1) % 4; openStep(idx); }, 3200);
        } else {
          close();
        }
      },
    });
  }

  // ---- Entrance: the quadrants slide in from their corners and lock together --
  if (reduced) return initExploded({ gsap, ScrollTrigger, reduced });
  const words = section.querySelectorAll('.process__word');
  const out = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
  const order = [0, 1, 3, 2]; // clockwise from 01
  gsap.set(quadPaths, { x: (i) => out[i][0] * 46, y: (i) => out[i][1] * 46, opacity: 0, transformOrigin: '50% 50%' });
  gsap.set(labels, { opacity: 0 });
  gsap.set(nums, { opacity: 0, y: 8 });
  gsap.set(hint, { opacity: 0 });
  gsap.set(words[0], { x: -80, opacity: 0, letterSpacing: '0.6em' });
  gsap.set(words[1], { x: 80, opacity: 0, letterSpacing: '0.6em' });
  const tl = gsap.timeline({ paused: true });
  order.forEach((q, k) => {
    tl.to(quadPaths[q], { opacity: 1, duration: 0.5 }, k * 0.09)
      .to(quadPaths[q], { x: 0, y: 0, duration: 1.6 }, k * 0.09);
  });
  tl.to(nums, { opacity: 1, y: 0, duration: 0.7, stagger: 0.06 }, 0.55)
    .to(labels, { opacity: 1, duration: 0.8, stagger: 0.08 }, 0.65)
    .to(words, { x: 0, opacity: 1, letterSpacing: '0.36em', duration: 1.6 }, 0.1)
    .to(hint, { opacity: 0.7, duration: 0.6 }, 1.1);
  ScrollTrigger.create({ trigger: diamond, start: 'top 78%', once: true, onEnter: () => tl.play() });

  initExploded({ gsap, ScrollTrigger, reduced });
}

/* ---- Exploded components row ---------------------------------------- */
function initExploded({ gsap, ScrollTrigger, reduced }) {
  const wrap = document.querySelector('.exploded');
  const svg = wrap?.querySelector('.exploded__svg');
  if (!svg) return;
  const parts = [...svg.querySelectorAll('.part')];
  const conns = [...svg.querySelectorAll('.conn')];
  const label = wrap.querySelector('.exploded__label');
  const vb = svg.viewBox.baseVal;

  // hover label beneath each part
  parts.forEach((p) => {
    const show = () => {
      const r = svg.getBoundingClientRect();
      const k = r.width / vb.width;
      label.textContent = p.dataset.label;
      label.style.left = `${(parseFloat(p.dataset.cx) - vb.x) * k}px`;
      label.style.top = `${(parseFloat(p.dataset.by) - vb.y) * k + 14}px`;
      gsap.to(label, { opacity: 1, y: 0, duration: 0.3, overwrite: true });
    };
    const hide = () => gsap.to(label, { opacity: 0, y: 4, duration: 0.2, overwrite: true });
    p.addEventListener('mouseenter', show);
    p.addEventListener('focus', show);
    p.addEventListener('mouseleave', hide);
    p.addEventListener('blur', hide);
  });

  if (reduced) return;

  // connectors are dashed, so reveal them with a growing clip rect (DrawSVG would fight the dash pattern)
  const defs = svg.querySelector('defs') || svg.insertBefore(document.createElementNS(NS, 'defs'), svg.firstChild);
  const clipRects = conns.map((c, i) => {
    const bb = c.getBBox();
    const cp = el('clipPath', { id: `conn-clip-${i}`, clipPathUnits: 'userSpaceOnUse' }, defs);
    const r = el('rect', { x: bb.x - 2, y: bb.y - 6, width: 0, height: bb.height + 12 }, cp);
    c.setAttribute('clip-path', `url(#conn-clip-${i})`);
    return { r, w: bb.width + 4 };
  });

  const partPaths = parts.map((p) => [...p.querySelectorAll('path')]);
  gsap.set(partPaths.flat(), { drawSVG: '0%' });

  const tl = gsap.timeline({
    scrollTrigger: { trigger: wrap, start: 'top 98%', end: 'bottom 85%', scrub: 0.3 },
    onComplete: () => { if (!played) flourish(); },
  });
  parts.forEach((p, i) => {
    const at = i * 0.3;
    tl.to(partPaths[i], { drawSVG: '100%', duration: 0.55, ease: 'none', stagger: 0.004 }, at);
    if (clipRects[i]) tl.to(clipRects[i].r, { attr: { width: clipRects[i].w }, duration: 0.55, ease: 'none' }, at + 0.2);
  });

  // one-time flourish when the row completes: parts slide together into one light, then apart
  let played = false;
  ScrollTrigger.create({
    trigger: wrap, start: 'bottom 85%', once: true,
    onEnter: () => { if (!played) { played = true; flourish(); } },
  });
  function flourish() {
    played = true;
    const centre = vb.x + vb.width / 2;
    const lifts = parts.map((p) => p.querySelector('.part__lift'));
    gsap.timeline({ delay: 0.2 })
      .to(lifts, { x: (i) => (centre - parseFloat(parts[i].dataset.cx)) * 0.86, scale: 0.85, transformOrigin: '50% 50%', duration: 0.9, stagger: { each: 0.03, from: 'edges' } })
      .to(svg.querySelectorAll('.conn'), { opacity: 0, duration: 0.3 }, 0)
      .to(lifts, { x: 0, scale: 1, duration: 1.1, stagger: { each: 0.03, from: 'center' } }, '+=0.35')
      .to(svg.querySelectorAll('.conn'), { opacity: 1, duration: 0.6 }, '<0.3')
      .add(() => gsap.set(lifts, { clearProps: 'transform' }));
  }
}

window.SSG = window.SSG || {};
window.SSG.initProcess = initProcess;
})();
