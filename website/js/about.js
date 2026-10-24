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
