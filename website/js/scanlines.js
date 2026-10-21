(function () {
/* ==========================================================================
   Scanline artwork (the signature texture): CTA skyline + footer landscape.
   The SVGs are fetched and inlined so their rows can be animated, then
   bucketed into horizontal row groups for a cheap cursor ripple.
   ========================================================================== */

// Street-light heads in the CTA skyline (SVG units, 1672 × 941)
const CTA_HEADS = [
  [117, 236], [212, 414], [60, 495], [298, 487], [205, 572], [405, 556], [470, 597], [455, 717], [540, 652], [587, 720],
  [692, 765], [773, 812], [845, 822], [921, 822], [998, 765], [1103, 690], [1188, 700], [1230, 600], [1330, 668],
  [1320, 527], [1420, 594], [1329, 718], [1455, 436], [1587, 550],
];

// The small solar lights in the footer landscape (SVG units, 2048 × 768): their lamps glow at dusk
const FOOTER_LAMPS = [[1879, 561], [1603, 604]];

async function inline(container) {
  const src = container.dataset.svgSrc;
  let text;
  if (window.SSG.isFile) {
    text = await window.SSG.readLocal(src); // opened from disk: embedded copy
  } else {
    const res = await fetch(src);
    if (!res.ok) throw new Error(`Failed to load ${src}`);
    text = await res.text();
  }
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  const svg = doc.documentElement;
  svg.removeAttribute('width');
  svg.removeAttribute('height');
  svg.setAttribute('preserveAspectRatio', 'xMidYMax meet');
  svg.setAttribute('aria-hidden', 'true');
  svg.querySelectorAll('title, desc').forEach((n) => n.remove());
  const node = document.importNode(svg, true);
  container.replaceChildren(node);
  return node;
}

// If the SVG cannot be inlined, still show the artwork as a plain image
function showImage(container) {
  const img = document.createElement('img');
  img.src = container.dataset.svgSrc;
  img.alt = '';
  container.replaceChildren(img);
}

function measure(paths) {
  return paths.map((p) => {
    const b = p.getBBox();
    return { el: p, cx: b.x + b.width / 2, cy: b.y + b.height / 2, x: b.x, w: b.width };
  });
}

// Group paths into horizontal row buckets so a ripple only moves ~100 groups
function bucket(svg, items, rowH, parentSel) {
  const NS = 'http://www.w3.org/2000/svg';
  const groups = new Map();
  const parents = new Map();
  items.forEach((it) => {
    const row = Math.round(it.cy / rowH);
    // one bucket per row *per parent*, so each path keeps its inherited fill colour
    const parent = parentSel ? it.el.closest(parentSel) || svg : it.el.parentNode;
    if (!parents.has(parent)) parents.set(parent, parents.size);
    const k = `${parents.get(parent)}:${row}`;
    if (!groups.has(k)) {
      const g = document.createElementNS(NS, 'g');
      g.dataset.row = row;
      parent.appendChild(g);
      groups.set(k, { y: row * rowH, g });
    }
    groups.get(k).g.appendChild(it.el);
  });
  return [...groups.values()];
}

function ripple({ gsap, section, svg, rows, viewH, amount = 4, radius = 60 }) {
  const movers = rows.map((r) => ({ y: r.y, to: gsap.quickTo(r.g, 'x', { duration: 0.6, ease: 'power3.out' }) }));
  let active = false;
  section.addEventListener('pointermove', (e) => {
    const rect = svg.getBoundingClientRect();
    const k = viewH / rect.height;
    const y = (e.clientY - rect.top) * k;
    const dir = (e.movementX || 0) >= 0 ? 1 : -1;
    active = true;
    movers.forEach((m) => {
      const d = Math.abs(m.y - y);
      m.to(d < radius ? Math.cos((d / radius) * Math.PI / 2) * amount * k * dir * Math.sign(Math.sin(m.y)) : 0);
    });
  });
  section.addEventListener('pointerleave', () => {
    if (!active) return;
    active = false;
    movers.forEach((m) => m.to(0));
  });
}

async function initCtaSkyline({ gsap, ScrollTrigger, reduced, finePointer, whileVisible = (el, a) => a }) {
  const section = document.querySelector('.cta');
  const container = section?.querySelector('.cta__skyline');
  if (!container) return;
  let svg;
  try { svg = await inline(container); } catch (e) { console.warn(e); showImage(container); return; }
  const vb = svg.viewBox.baseVal;
  const items = measure([...svg.querySelectorAll('path')]);
  const half = vb.width / 2;

  // glow dots + shimmer overlay
  const glows = CTA_HEADS.map(([x, y]) => {
    const d = document.createElement('span');
    d.className = 'cta__glow';
    d.style.left = `${(x / vb.width) * 100}%`;
    d.style.top = `${(y / vb.height) * 100}%`;
    container.appendChild(d);
    return d;
  });
  const shimmerWrap = document.createElement('span');
  shimmerWrap.className = 'cta__shimmer-wrap';
  const shimmer = document.createElement('span');
  shimmer.className = 'cta__shimmer';
  shimmerWrap.appendChild(shimmer);
  container.appendChild(shimmerWrap);

  if (reduced) {
    gsap.set(glows, { opacity: 1, scale: 1 });
    return;
  }

  // rows draw in from both outer edges towards the centre, bottom rows first
  const order = [...items].sort((a, b) => b.cy - a.cy || Math.abs(a.cx - half) - Math.abs(b.cx - half));
  gsap.set(order.map((o) => o.el), { scaleX: 0, transformOrigin: (i) => (order[i].cx < half ? '0% 50%' : '100% 50%') });

  const tl = gsap.timeline({ paused: true });
  tl.to(order.map((o) => o.el), { scaleX: 1, duration: 1.6, stagger: { each: 1.5 / order.length } })
    .to(glows, { opacity: 1, scale: 1, duration: 0.45, stagger: 0.06 }, '-=0.3')
    .to(shimmer, { opacity: 1, duration: 0.6 }, '-=0.4')
    .add(() => {
      // the shimmer band and the glows are their own GPU layers, so these loops never repaint
      // the skyline; they also stop while the section is off screen
      whileVisible(section, gsap.fromTo(shimmer, { xPercent: -160 }, { xPercent: 260, duration: 5, ease: 'sine.inOut', repeat: -1, repeatDelay: 1.5, force3D: true }));
      whileVisible(section, gsap.to(glows, { opacity: 0.75, duration: 1.8, ease: 'sine.inOut', repeat: -1, yoyo: true, stagger: { each: 0.25, from: 'random' } }));
      // transforms are only needed for the intro; drop them so the ripple groups stay cheap
      gsap.set(order.map((o) => o.el), { clearProps: 'transform' });
    });

  ScrollTrigger.create({ trigger: section, start: 'top 55%', once: true, onEnter: () => tl.play() });

  if (finePointer) {
    const rows = bucket(svg, items, 7);
    ripple({ gsap, section, svg, rows, viewH: vb.height, amount: 4, radius: 55 });
  }
}

async function initFooterLandscape({ gsap, ScrollTrigger, reduced, finePointer, whileVisible = (el, a) => a }) {
  const footer = document.querySelector('.footer');
  const container = footer?.querySelector('.footer__landscape');
  if (!container) return;
  let svg;
  try { svg = await inline(container); } catch (e) { console.warn(e); showImage(container); return; }
  const vb = svg.viewBox.baseVal;
  const all = measure([...svg.querySelectorAll('path')]);

  // clouds: white artwork in the upper band drifts slowly. They move to an identical
  // SVG laid over the landscape, so the drift is a GPU transform instead of a repaint
  // of the whole landscape every frame.
  const white = svg.querySelector('#white-scanlines, #white-artwork') || svg.querySelectorAll('g')[1];
  const NS = 'http://www.w3.org/2000/svg';
  const cloudItems = all.filter((it) => white && white.contains(it.el) && it.cy < vb.height * 0.5);
  const clouds = document.createElementNS(NS, 'svg');
  ['viewBox', 'preserveAspectRatio', 'aria-hidden'].forEach((a) => clouds.setAttribute(a, svg.getAttribute(a)));
  clouds.setAttribute('class', 'footer__clouds');
  const cloudHost = white ? white.cloneNode(false) : document.createElementNS(NS, 'g'); // keeps the white fill
  cloudHost.removeAttribute('id');
  cloudItems.forEach((it) => cloudHost.appendChild(it.el));
  clouds.appendChild(cloudHost);
  container.appendChild(clouds);
  const rest = all.filter((it) => !cloudItems.includes(it));

  // lamp glows, in a layer with the artwork's own aspect ratio (the SVG is bottom-anchored)
  const lampLayer = document.createElement('span');
  lampLayer.style.cssText = `position:absolute;left:0;bottom:0;width:100%;aspect-ratio:${vb.width}/${vb.height};pointer-events:none`;
  const lamps = FOOTER_LAMPS.map(([x, y]) => {
    const d = document.createElement('span');
    d.className = 'cta__glow';
    d.style.left = `${(x / vb.width) * 100}%`;
    d.style.top = `${(y / vb.height) * 100}%`;
    lampLayer.appendChild(d);
    return d;
  });
  container.appendChild(lampLayer);

  if (reduced) { gsap.set(lamps, { opacity: 1, scale: 1 }); return; }

  // lines reveal from the bottom up
  const groups = bucket(svg, rest, 6, 'g[id]');
  const sorted = [...groups].sort((a, b) => b.y - a.y);
  gsap.set(sorted.map((r) => r.g), { opacity: 0, y: 10 });
  gsap.set(clouds, { opacity: 0 });
  const tl = gsap.timeline({ paused: true })
    .to(sorted.map((r) => r.g), { opacity: 1, y: 0, duration: 1.6, stagger: { each: 1.3 / sorted.length } })
    .to(clouds, { opacity: 1, duration: 1.6 }, '-=0.6')
    .to(lamps, { opacity: 1, scale: 1, duration: 0.45, stagger: 0.2 }, '-=0.8');
  ScrollTrigger.create({ trigger: container, start: 'top 85%', once: true, onEnter: () => tl.play() });

  whileVisible(footer, gsap.to(clouds, { xPercent: (26 / vb.width) * 100, duration: 9, ease: 'sine.inOut', repeat: -1, yoyo: true, force3D: true }));

  if (finePointer) ripple({ gsap, section: footer, svg, rows: groups, viewH: vb.height, amount: 5, radius: 45 });
}

window.SSG = window.SSG || {};
window.SSG.initCtaSkyline = initCtaSkyline;
window.SSG.initFooterLandscape = initFooterLandscape;
})();
