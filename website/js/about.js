/* ==========================================================================
   SSG About page. Shared setup (GSAP, Lenis, preloader, nav, modal, links,
   page transition, reveals) comes from core.js; the CTA skyline and footer
   landscape from scanlines.js. Each section has one builder below, and
   the gold thread that runs down the whole page has its own.
   ========================================================================== */
(function () {
const core = window.SSG.initCore?.({ page: 'about' });
window.__ssgBooted = true;
if (!core) return;
const {
  gsap, ScrollTrigger, SplitText, lenis, $, $$, reduced, mobile, finePointer, desktopMotion, toggle,
  whileVisible, setProgress, openPreloader, fontsReady, pageFonts, typeIn, basicReveals, buildNav,
} = core;
const { initCtaSkyline, initFooterLandscape } = window.SSG;

// ---------------------------------------------------------------------------
// Text scramble for mono labels: characters cycle through glyphs and settle left to right
const GLYPHS = '!<>-_\\/[]{}—=+*^?#ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
function scramble(el, { duration = 1.1, paused = false } = {}) {
  const text = el.textContent;
  const o = { p: 0 };
  return gsap.to(o, {
    p: 1, duration, ease: 'none', paused,
    onStart: () => el.setAttribute('aria-label', text),
    onUpdate: () => {
      const done = Math.floor(o.p * text.length);
      el.textContent = text.slice(0, done) + [...text.slice(done)].map((c) => (c === ' ' ? ' ' : GLYPHS[(Math.random() * GLYPHS.length) | 0])).join('');
    },
    onComplete: () => { el.textContent = text; },
  });
}

// ---------------------------------------------------------------------------
// 01 · Hero: letters drop in with blur, the horizon draws from the centre out, the sun rises
// a little with scroll, the scanline mist drifts
function buildHero() {
  const hero = $('.ab-hero');
  const tl = gsap.timeline({ paused: true });
  if (reduced) return tl;
  const split = SplitText.create('.ab-hero__title', { type: 'lines,chars', linesClass: 'ab-hero__line' });
  gsap.set(split.chars, { yPercent: -60, opacity: 0, filter: 'blur(10px)' });
  gsap.set('.ab-hero__horizon', { scaleX: 0 });
  gsap.set('.ab-hero__sun', { yPercent: 35, opacity: 0 });
  gsap.set(['.ab-hero__sub', '.ab-hero__hint'], { opacity: 0, y: 20 });
  tl.to('.ab-hero__horizon', { scaleX: 1, duration: 1.6 }, 0)
    .to('.ab-hero__sun', { yPercent: 0, opacity: 1, duration: 1.8 }, 0.25)
    .to(split.chars, { yPercent: 0, opacity: 1, filter: 'blur(0px)', duration: 1.1, stagger: 0.022, onComplete: () => gsap.set(split.chars, { clearProps: 'filter' }) }, 0.2)
    .add(() => scramble($('.ab-hero .ab-label')).play(), 0.3)
    .to('.ab-hero__sub', { opacity: 1, y: 0, duration: 1.6 }, 0.9)
    .to('.ab-hero__hint', { opacity: 1, y: 0, duration: 1.2 }, 1.4);
  // the sun climbs a little and the copy lifts away as the page scrolls on
  if (desktopMotion) {
    gsap.to('.ab-hero__sun', { yPercent: -18, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.ab-hero__copy', { y: -80, opacity: 0.2, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
  }
  $$('.ab-hero__mist span').forEach((m, i) => whileVisible(hero, gsap.to(m, { xPercent: i ? -6 : 6, duration: 14 + i * 5, ease: 'sine.inOut', yoyo: true, repeat: -1 })));
  return tl;
}

// ---------------------------------------------------------------------------
// 02 · Our Story: pinned while the body is read along (words 15% → 100%); the pull quote rises line
// by line from behind a mask; the photo strip drifts in parallax
function buildStory() {
  const sec = $('.ab-story');
  const body = $('[data-readalong]', sec);
  const words = SplitText.create(body.querySelectorAll('p'), { type: 'words', wordsClass: 'ab-word' }).words;
  if (reduced) { gsap.set(words, { opacity: 1 }); return; }
  const quote = SplitText.create('.ab-story__quote p', { type: 'lines', mask: 'lines' });
  gsap.from(quote.lines, { yPercent: 110, duration: 1.6, stagger: 0.12, scrollTrigger: { trigger: '.ab-story__quote', start: 'top 82%', toggleActions: toggle } });
  scrambleOnEnter($('.ab-label', sec));
  if (desktopMotion) {
    gsap.to(words, {
      opacity: 1, stagger: 0.1, ease: 'none',
      scrollTrigger: { trigger: '.ab-story__pin', start: 'top 18%', end: () => `+=${window.innerHeight * 1.2}`, pin: true, scrub: 0.6 },
    });
    gsap.fromTo('.ab-story__strip img', { yPercent: -8 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: '.ab-story__strip', start: 'top bottom', end: 'bottom top', scrub: true } });
  } else {
    gsap.to(words, { opacity: 1, stagger: 0.02, duration: 0.6, ease: 'none', scrollTrigger: { trigger: body, start: 'top 80%' } });
  }
}

// ---------------------------------------------------------------------------
// 03 · Mission & Vision: the two statements start overlapped in the centre and slide apart as the
// divider between them draws (the gold thread draws the divider itself)
function buildMissionVision() {
  const sec = $('.ab-mv');
  $$('.ab-label', sec).forEach(scrambleOnEnter);
  if (reduced) return;
  if (!desktopMotion) {
    gsap.from($$('.ab-mv__col', sec), { y: 30, opacity: 0, duration: 1.2, stagger: 0.15, scrollTrigger: { trigger: sec, start: 'top 80%' } });
    return;
  }
  const l = $('.ab-mv__col--l', sec);
  const r = $('.ab-mv__col--r', sec);
  // how far each column sits from the centre line
  const shift = (el) => { const a = el.getBoundingClientRect(); const g = $('.ab-mv__divider', sec).getBoundingClientRect(); return g.left - (a.left + a.width / 2); };
  gsap.timeline({ scrollTrigger: { trigger: sec, start: 'top 75%', end: 'top 25%', scrub: 0.8, invalidateOnRefresh: true } })
    .fromTo(l, { x: () => shift(l), opacity: 0.35 }, { x: 0, opacity: 1, ease: 'none' }, 0)
    .fromTo(r, { x: () => shift(r), opacity: 0.35 }, { x: 0, opacity: 1, ease: 'none' }, 0);
}

// ---------------------------------------------------------------------------
// 04 · By the Numbers: odometer digits roll to their value and land with a small gold flash, while a
// thin gold bar fills under each stat
function buildNumbers() {
  const sec = $('.ab-num');
  scrambleOnEnter($('.ab-label', sec));
  const stats = $$('.ab-stat', sec);
  if (reduced) return;
  stats.forEach((stat, i) => {
    const value = $('[data-odometer]', stat);
    const text = value.dataset.odometer;
    // each digit becomes a column 0..9 (+ a full extra turn for the leading digits, so they visibly roll)
    value.textContent = '';
    const cols = [];
    [...text].forEach((ch, k) => {
      if (!/\d/.test(ch)) { const s = document.createElement('span'); s.textContent = ch; value.appendChild(s); return; }
      const odo = document.createElement('span');
      odo.className = 'ab-odo';
      odo.setAttribute('aria-hidden', 'true');
      // the window is as wide as its final digit (Unbounded's numerals are proportional)
      const probe = document.createElement('span');
      probe.textContent = ch;
      value.appendChild(probe);
      odo.style.width = `${probe.getBoundingClientRect().width / parseFloat(getComputedStyle(value).fontSize)}em`;
      probe.remove();
      const col = document.createElement('span');
      col.className = 'ab-odo__col';
      const turns = 1 + (k % 2);
      for (let n = 0; n <= 10 * turns + +ch; n++) { const d = document.createElement('span'); d.textContent = n % 10; col.appendChild(d); }
      odo.appendChild(col);
      value.appendChild(odo);
      cols.push({ col, steps: 10 * turns + +ch });
    });
    gsap.set(stat, { '--fill': 0, '--flash': 0 });
    const tl = gsap.timeline({ paused: true });
    cols.forEach(({ col, steps }, k) => tl.fromTo(col, { yPercent: 0 }, { yPercent: -(100 * steps) / (steps + 1), duration: 1.6 + k * 0.12, ease: 'power3.out' }, 0));
    tl.to(stat, { '--fill': 1, duration: 1.6, ease: 'power2.inOut' }, 0)
      .to(stat, { '--flash': 1, duration: 0.15, ease: 'power1.out' }, '>-0.25')
      .to(stat, { '--flash': 0, duration: 0.6, ease: 'power1.in' });
    ScrollTrigger.create({ trigger: stat, start: 'top 85%', once: true, onEnter: () => gsap.delayedCall(i * 0.12, () => tl.play()) });
  });
}

// ---------------------------------------------------------------------------
// 05 · From the Director: a gold scan line reveals the portrait (scanlines first, resolving to the
// photo); the quote types in behind a blinking gold caret; portrait and panel follow the mouse
function buildDirector() {
  const sec = $('.ab-dir');
  const portrait = $('.ab-dir__portrait', sec);
  scrambleOnEnter($('.ab-label', sec));
  if (reduced) return;
  gsap.set(portrait, { '--hide': '100%', '--scan': 0 });
  gsap.set('.ab-dir__lines', { opacity: 0 });
  // the quote types in with the caret riding just after the last character typed
  const quote = $('[data-typequote]', sec);
  const caret = $('.ab-dir__caret', sec);
  const box = quote.parentElement;
  const chars = SplitText.create(quote, { type: 'words,chars', charsClass: 'type-char' }).chars;
  gsap.set(chars, { autoAlpha: 0 });
  const placeCaret = (ch) => {
    const b = box.getBoundingClientRect();
    const r = ch.getBoundingClientRect();
    gsap.set(caret, { x: r.right - b.left, y: r.bottom - b.top });
  };
  placeCaret(chars[0]);
  const typing = gsap.timeline({ paused: true });
  chars.forEach((ch, i) => typing.call(() => { gsap.set(ch, { autoAlpha: 1 }); placeCaret(ch); }, null, i * 0.028));
  gsap.timeline({ scrollTrigger: { trigger: portrait, start: 'top 75%', toggleActions: 'play none none none' } })
    .to('.ab-dir__lines', { opacity: 1, duration: 0.5, ease: 'power1.out' }, 0)
    .to(portrait, { '--scan': 1, duration: 0.2 }, 0.3)
    .to(portrait, { '--hide': '0%', duration: 1.8, ease: 'power2.inOut' }, 0.35)
    .to(portrait, { '--scan': 0, duration: 0.4 }, 2.05)
    .to('.ab-dir__lines', { opacity: 0, duration: 0.8 }, 1.4)
    .add(() => typing.play(), 0.6);
  if (!finePointer) return;
  const px = gsap.quickTo(portrait, 'x', { duration: 0.8, ease: 'power3.out' });
  const py = gsap.quickTo(portrait, 'y', { duration: 0.8, ease: 'power3.out' });
  const bx = gsap.quickTo('.ab-dir__panel', 'x', { duration: 1.1, ease: 'power3.out' });
  const by = gsap.quickTo('.ab-dir__panel', 'y', { duration: 1.1, ease: 'power3.out' });
  sec.addEventListener('pointermove', (e) => {
    const nx = e.clientX / window.innerWidth - 0.5;
    const ny = e.clientY / window.innerHeight - 0.5;
    px(nx * 18); py(ny * 14); bx(nx * -26); by(ny * -18);
  });
  sec.addEventListener('pointerleave', () => { px(0); py(0); bx(0); by(0); });
}

// ---------------------------------------------------------------------------
// 06 · Our Values: the cards fan out from a stack; gold circuit lines connect them and a pulse hops
// card to card, drawing each icon as it arrives. Hover: 3D tilt + a gold edge glow under the cursor.
function buildValues() {
  const sec = $('.ab-values');
  const stage = $('.ab-values__stage', sec);
  const cards = $$('.ab-val__card', sec);
  const icons = cards.map((c) => $('.ab-val__icon path', c));
  const wire = $('.ab-values__wire', sec);
  const pulse = $('.ab-values__pulse', sec);
  scrambleOnEnter($('.ab-label', sec));

  // the wire runs centre to centre (behind the glass), so it follows the grid at any width
  let stops = [];
  const layout = () => {
    const s = stage.getBoundingClientRect();
    const pts = cards.map((c) => { const r = c.getBoundingClientRect(); return [r.left - s.left + r.width / 2, r.top - s.top + r.height * 0.32]; });
    const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join('');
    wire.setAttribute('d', d);
    pulse.setAttribute('d', d);
    let acc = 0;
    stops = pts.map((p, i) => { if (i) acc += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]); return acc; });
  };
  layout();
  ScrollTrigger.addEventListener('refreshInit', () => { gsap.set(cards, { clearProps: 'x,y,rotation' }); });
  ScrollTrigger.addEventListener('refresh', layout);

  if (reduced) { cards.forEach((c) => c.classList.add('is-on')); return; }
  gsap.set(icons, { drawSVG: '0%', fillOpacity: 0 });
  gsap.set(wire, { drawSVG: '0%' });
  gsap.set(pulse, { drawSVG: '0% 0%', opacity: 0 });

  // fan out from a stack at the centre of the row
  const fromStack = (i, el) => {
    const s = stage.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return (s.left + s.width / 2) - (r.left + r.width / 2);
  };
  const run = gsap.timeline({ paused: true });
  if (desktopMotion) {
    run.fromTo(cards, { x: fromStack, y: 40, rotation: (i) => (i - 1.5) * 5, opacity: 0.6 }, { x: 0, y: 0, rotation: 0, opacity: 1, duration: 1.4, stagger: 0.08 }, 0);
  } else {
    run.from(cards, { y: 30, opacity: 0, duration: 1, stagger: 0.12 }, 0);
  }
  run.to(wire, { drawSVG: '100%', duration: 1.2, ease: 'power1.inOut' }, desktopMotion ? 0.9 : 0.4);
  // the pulse: a short bright dash travelling the wire; each icon draws as it arrives
  const head = { t: 0 };
  const total = () => stops[stops.length - 1] || 1;
  let lit = -1;
  run.set(pulse, { opacity: 1 }, '>-0.6')
    .to(head, {
      t: 1, duration: 2.6, ease: 'none',
      onUpdate: () => {
        const L = total();
        const at = head.t * L;
        gsap.set(pulse, { drawSVG: `${Math.max(0, at - 50)} ${at}` });
        while (lit + 1 < cards.length && at >= stops[lit + 1] - 1) {
          lit++;
          const c = cards[lit];
          gsap.timeline()
            .to(icons[lit], { drawSVG: '100%', duration: 0.7, ease: 'power1.inOut' })
            .to(icons[lit], { fillOpacity: 1, duration: 0.4 }, '-=0.2')
            .add(() => c.classList.add('is-on'), '-=0.3');
        }
      },
    }, '<')
    .to(pulse, { opacity: 0, duration: 0.3 });
  ScrollTrigger.create({ trigger: stage, start: 'top 72%', once: true, onEnter: () => run.play() });

  if (!finePointer) return;
  cards.forEach((card) => {
    const rx = gsap.quickTo(card, 'rotationX', { duration: 0.5, ease: 'power3.out' });
    const ry = gsap.quickTo(card, 'rotationY', { duration: 0.5, ease: 'power3.out' });
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      card.style.setProperty('--mx', `${px * 100}%`);
      card.style.setProperty('--my', `${py * 100}%`);
      ry((px - 0.5) * 12); rx(-(py - 0.5) * 12);
    });
    card.addEventListener('pointerleave', () => { rx(0); ry(0); });
  });
}

// ---------------------------------------------------------------------------
// 07 · Our Divisions: the hovered (or focused) panel widens to ~60% and its image and text come in;
// the others compress to a rotated title. Images float gently over a pulsing glow.
function buildDivisions() {
  const sec = $('.ab-divs');
  const panels = $$('.ab-div', sec);
  scrambleOnEnter($('.ab-label', sec));
  const activate = (p) => panels.forEach((q) => q.classList.toggle('is-active', q === p));
  panels.forEach((p) => {
    p.addEventListener('pointerenter', () => { if (!mobile) activate(p); });
    p.addEventListener('focus', () => activate(p));
    p.addEventListener('click', () => activate(p));
  });
  if (reduced) return;
  gsap.from(panels, { y: 50, opacity: 0, duration: 1.4, stagger: 0.1, scrollTrigger: { trigger: '.ab-divs__row', start: 'top 80%', toggleActions: toggle } });
  panels.forEach((p, i) => {
    whileVisible(sec, gsap.to($('.ab-div__media', p), { y: -10, duration: 3.2 + i * 0.4, ease: 'sine.inOut', yoyo: true, repeat: -1 }));
    whileVisible(sec, gsap.fromTo($('.ab-div__glow', p), { scale: 0.92 }, { scale: 1.08, duration: 2.4 + i * 0.3, ease: 'sine.inOut', yoyo: true, repeat: -1 }));
  });
}

// mono labels scramble in when they first scroll into view
function scrambleOnEnter(el) {
  if (!el || reduced) return;
  const tw = scramble(el, { paused: true });
  ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true, onEnter: () => tw.play() });
}

// ---------------------------------------------------------------------------
// Scroll progress: the gold line on the right edge fills with the page, and the label names the
// section in view (sections carry data-label)
function buildProgress() {
  const bar = $('.ab-progress__bar');
  const label = $('.ab-progress__label');
  if (!bar) return;
  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (self) => gsap.set(bar, { scaleY: self.progress }) });
  $$('[data-label]').forEach((sec) => {
    ScrollTrigger.create({
      trigger: sec, start: 'top 55%', end: 'bottom 55%',
      onToggle: (self) => { if (self.isActive) label.textContent = `// ${sec.dataset.label}`; },
    });
  });
}

// ---------------------------------------------------------------------------
// CTA + footer (the home page's): magnetic buttons; the skyline's lamps are switched on by the
// gold thread when it arrives (see buildThread)
let skyline = null;
function buildCta() {
  const near = (sel, fn) => ScrollTrigger.create({ trigger: sel, start: 'top 250%', once: true, onEnter: fn });
  near('.cta', async () => {
    skyline = await initCtaSkyline({ gsap, ScrollTrigger, reduced, finePointer, whileVisible, lamps: 'manual' });
    if (threadDone) skyline?.lightLamps();
  });
  near('.footer', () => initFooterLandscape({ gsap, ScrollTrigger, reduced, finePointer, whileVisible }));
  if (reduced || !finePointer) return;
  $$('[data-magnetic]').forEach((btn) => {
    const x = gsap.quickTo(btn, 'x', { duration: 0.5, ease: 'power3.out' });
    const y = gsap.quickTo(btn, 'y', { duration: 0.5, ease: 'power3.out' });
    btn.addEventListener('pointermove', (e) => {
      const r = btn.getBoundingClientRect();
      x((e.clientX - (r.left + r.width / 2)) * 0.3);
      y((e.clientY - (r.top + r.height / 2)) * 0.4);
    });
    btn.addEventListener('pointerleave', () => { x(0); y(0); });
  });
}
let threadDone = false;

// ---------------------------------------------------------------------------
// Boot: a short preloader (no 3D here), then the page builds and the hero plays
async function boot() {
  const fill = setProgress(1, 0.6);
  await Promise.all([fontsReady, pageFonts(), new Promise((r) => fill.eventCallback('onComplete', r))]);
  const heroIntro = buildHero();
  buildStory();
  buildMissionVision();
  buildNumbers();
  buildDirector();
  buildValues();
  buildDivisions();
  basicReveals();
  buildCta();
  buildProgress();
  buildNav();
  ScrollTrigger.refresh();
  await new Promise((r) => setTimeout(r, 150));
  await openPreloader({ onOpen: () => heroIntro.play() });
}

boot().catch((err) => {
  core.staticFallback(err);
  lenis?.start();
});
})();
