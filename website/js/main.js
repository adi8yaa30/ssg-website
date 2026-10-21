/* ==========================================================================
   SSG home page: Lenis + GSAP setup, preloader, nav and section
   timelines. The 3D street light lives in scene.js and is only loaded on
   desktop with WebGL; mobile and no-WebGL use static images.

   Asset mapping (provided folder -> web-safe folder used here)
   --------------------------------------------------------------------------
   assets/1. Hero-Section/ssg-streetlight-realistic.glb   -> assets/01-hero/model/ssg-streetlight.web.glb
        (gltf-transform optimize: Draco + WebP 2048, palette/simplify off so
         node + material names such as Panel and M_LED survive; 34.6 MB -> 1.95 MB)
   assets/1. Hero-Section/hero-section-starting-viewport…  -> assets/01-hero/streetlight-fallback.webp (design crop)
   assets/1. Hero-Section/{pole,trusted,end-to-end}-icon.svg, certified-icon/, range-icon/, sun-icon-svg/
        -> inlined in index.html (multi-file icons recombined into single SVGs)
   assets/1. Hero-Section/solar-lines-icon/                 -> inline grid + diamonds (.solar-grid)
   assets/2. Our-Product-Section/N. <Product>/              -> assets/02-products/0N-<product>/{photo,blueprint}.webp
        NOTE: the grass photos were misfiled in the export. They are matched to
        their blueprints by content: All-in-One <- "5. Flood-Light/5.png",
        AC <- "2. All-in-Solar-Street-Light/2.png", Flood <- "4. AC-Street-Light/4.png".
        Semi-Integrated has no grass photo: photo-placeholder.webp is a Figma crop.
   assets/2. Our-Product-Section/batter-icon.svg, solar-panel-layer-icon/ -> inline #i-battery, #i-layers
   assets/3. Our-Mission-Section/image.jpg, image-svg.svg  -> assets/03-mission/image.webp (+ tiles in CSS)
   assets/4. National-Flag-Section/*                        -> assets/04-flag/{national-flag,flag-sky,project-image}.webp
   assets/6. Logos-Section/10 copy.png … 16 copy.png       -> assets/06-logos/10-nrl.webp … 16-panchayat-rural-dev-assam.webp
   assets/7. SSG-Process-Section/*.svg                      -> assets/07-process/*.svg (line art)
   assets/7. SSG-Process-Section/*-svg.zip                  -> unzipped to assets/07-process/parts/<part>/ and
        recombined (positions recovered from the Figma frame) into the inline .exploded__svg
   assets/8. CTA-Section/CTA.svg                            -> assets/08-cta/cta-skyline.svg
   assets/9. Footer-Section/footer.svg                      -> assets/09-footer/footer-landscape.svg
   assets/logo-new.png                                      -> assets/logo-new.webp (trimmed, 600px)
   ========================================================================== */
(function () {
// Section modules register themselves on window.SSG (plain scripts, so the
// page also works when index.html is opened straight from disk).
const { initProducts, initProcess, initFlag, initCtaSkyline, initFooterLandscape } = window.SSG || {};
window.__ssgBooted = true;

const { gsap, ScrollTrigger, SplitText, DrawSVGPlugin, CustomEase, Lenis } = window;
const root = document.documentElement;
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = matchMedia('(max-width: 767px)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const debug = new URLSearchParams(location.search).has('debug');
// Pins, scrubs and the 3D choreography are desktop-only; phones get simple one-shot reveals
const desktopMotion = !reduced && !mobile;
const toggle = mobile ? 'play none none none' : 'play none none reverse';

// ---------------------------------------------------------------------------
// Fluid unit: 1 Figma px (frame is 1728 wide)
const setUnit = () => root.style.setProperty('--u', `${root.clientWidth / 1728}px`);
setUnit();
window.addEventListener('resize', setUnit);

// Show the page without motion if anything essential is missing
function staticFallback(reason) {
  console.warn('[SSG] static fallback:', reason);
  root.classList.add('no-webgl', 'static-panels', 'reduced-motion');
  document.getElementById('preloader')?.remove();
  document.body.classList.remove('is-loading');
}
if (!gsap || !ScrollTrigger || !initProducts) {
  staticFallback('scripts unavailable');
  return;
}

gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin, CustomEase);
// the site's one motion curve; entrances run 1.6s on it (scroll-linked tweens and ambient loops opt out)
CustomEase.create('ssg', '0.4,0.01,0.04,1');
gsap.defaults({ ease: 'ssg' });
// mobile browsers resize the viewport as the address bar slides; don't re-measure every trigger for that
ScrollTrigger.config({ ignoreMobileResize: true });

// Endless ambient loops (sun bob, cloud drift, marquee, glows…) only tick while their
// section is on screen, so off-screen sections cost nothing per frame
const ambient = new Map();
const ambientIO = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => entries.forEach((e) => {
  const a = ambient.get(e.target);
  a.on = e.isIntersecting;
  a.anims.forEach((anim) => anim.paused(!a.on));
}), { rootMargin: '80px 0px' }) : null;
function whileVisible(el, anim) {
  if (!el || !anim || !ambientIO) return anim;
  let a = ambient.get(el);
  if (!a) { a = { on: false, anims: [] }; ambient.set(el, a); ambientIO.observe(el); }
  a.anims.push(anim);
  anim.paused(!a.on);
  return anim;
}

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
}
const use3D = !mobile && hasWebGL();
if (!use3D) root.classList.add('no-webgl');
if (reduced) root.classList.add('reduced-motion');
if (reduced || !use3D) root.classList.add('static-panels');
document.body.classList.add('is-loading');

// ---------------------------------------------------------------------------
// Smooth scroll (Lenis, synced with ScrollTrigger)
let lenis = null;
if (!reduced && Lenis) {
  lenis = new Lenis({ lerp: 0.1, smoothWheel: true, autoRaf: false });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop();
}
window.scrollTo(0, 0);
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

function scrollToTarget(target, onComplete) {
  if (lenis) lenis.scrollTo(target, { duration: 1.4, onComplete });
  else {
    const y = typeof target === 'number' ? target : target.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
    if (onComplete) setTimeout(onComplete, reduced ? 0 : 700);
  }
}

// ---------------------------------------------------------------------------
// Preloader: battery bar fills with the GLB download, then the screen splits open
const preloader = $('#preloader');
const pctEl = $('#preloader-pct');
const fills = $$('.preloader__fill');
const progress = { v: 0 };
function renderProgress() {
  gsap.set(fills[0], { scaleX: Math.min(1, progress.v * 2) });
  gsap.set(fills[1], { scaleX: Math.max(0, Math.min(1, progress.v * 2 - 1)) });
  pctEl.textContent = Math.round(progress.v * 100);
}
function setProgress(p) {
  gsap.to(progress, { v: Math.max(progress.v, p), duration: 0.5, overwrite: true, onUpdate: renderProgress });
}

const fontsReady = (document.fonts ? document.fonts.ready : Promise.resolve()).catch(() => {});

// ---------------------------------------------------------------------------
// 3D scene (desktop + WebGL only)
const canvas = $('#scene');
let scene = null;
let sceneApi = null;
const anchors = { streetlight: $('#anchor-streetlight'), why: $('#anchor-panel-why'), sun: $('#anchor-panel-sun') };
const heroPoints = { pole: null, led: null };

async function load3D() {
  if (!use3D) {
    // no GLB: let the bar follow the hero image instead
    const img = $('#anchor-streetlight img');
    await new Promise((r) => (img.complete ? r() : (img.onload = img.onerror = r)));
    setProgress(0.9);
    return;
  }
  try {
    scene = await window.SSG.createScene({
      canvas,
      anchors,
      reducedMotion: reduced,
      onProgress: (p) => setProgress(p * 0.95),
      onHeroPoints: (pts) => { heroPoints.pole = pts.pole; heroPoints.led = pts.led; },
    });
    sceneApi = scene.api;
    const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('GLB load timeout')), 15000));
    await Promise.race([scene.loaded, timeout]);
    gsap.set(canvas, { opacity: reduced ? 1 : 0 });
    gsap.ticker.add((t, dt) => scene.frame(Math.min(dt, 50) / 1000));
    if (debug) window.__ssg = { scene, sceneApi, gsap, ScrollTrigger };
  } catch (err) {
    console.warn('[SSG] 3D disabled:', err);
    sceneApi = null;
    canvas.style.display = 'none';
    root.classList.add('no-webgl', 'static-panels');
  }
}

// ---------------------------------------------------------------------------
// Hero callout leader lines follow the model's projected points
const hero = $('.hero');
const leaderPole = $('.leader--pole');
const leaderLed = $('.leader--led');
const nodePole = $('.leader__node--pole');
const nodeLed = $('.leader__node--led');
const calloutPole = $('.callout--pole');
const calloutLed = $('.callout--led');

// the leaders are only measured while the hero is on screen
let heroOn = true;
if ('IntersectionObserver' in window) new IntersectionObserver(([e]) => { heroOn = e.isIntersecting; }).observe(hero);

function updateLeaders() {
  if (!heroOn || !heroPoints.pole || !use3D) return;
  const hr = hero.getBoundingClientRect();
  if (hr.bottom < 0) return;
  const u = root.clientWidth / 1728;
  const pole = { x: heroPoints.pole.x - hr.left, y: heroPoints.pole.y - hr.top };
  const led = { x: heroPoints.led.x - hr.left, y: heroPoints.led.y - hr.top };
  // the boxes grow with their text and the frame stretches, so meet the notch (y 34 / 33 of 140) proportionally
  const lp = { x: calloutPole.offsetLeft + calloutPole.offsetWidth, y: calloutPole.offsetTop + calloutPole.offsetHeight * (34 / 140) };
  const ll = { x: calloutLed.offsetLeft, y: calloutLed.offsetTop + calloutLed.offsetHeight * (33 / 140) };
  // pole: short run left, 45° diagonal down, long run to the box
  const a1 = pole.x - 22 * u;
  const d1 = Math.max(lp.x + 10 * u, a1 - Math.max(0, lp.y - pole.y));
  leaderPole.setAttribute('d', `M${pole.x} ${pole.y}H${a1}L${d1} ${lp.y}H${lp.x}`);
  // LED head: short run right, steep diagonal down, long run to the box
  const a2 = led.x + 18 * u;
  const d2 = Math.min(ll.x - 10 * u, a2 + Math.max(0, ll.y - led.y) * 0.27);
  leaderLed.setAttribute('d', `M${led.x} ${led.y}H${a2}L${d2} ${ll.y}H${ll.x}`);
  nodePole.setAttribute('cx', pole.x); nodePole.setAttribute('cy', pole.y);
  nodeLed.setAttribute('cx', led.x); nodeLed.setAttribute('cy', led.y);
}
if (use3D) gsap.ticker.add(updateLeaders);
else $('.hero__leaders').style.display = 'none';

// ---------------------------------------------------------------------------
// Typing helper for mono labels
function typeIn(el, opts = {}) {
  const split = SplitText.create(el, { type: 'words,chars', charsClass: 'type-char' });
  gsap.set(split.chars, { autoAlpha: 0 });
  return gsap.to(split.chars, { autoAlpha: 1, duration: 0.01, stagger: opts.stagger ?? 0.022, ease: 'none', ...opts });
}
function countUp(el, duration = 1.6) {
  const to = parseFloat(el.dataset.to);
  const o = { v: 0 };
  el.textContent = '0';
  return gsap.to(o, { v: to, duration, onUpdate: () => { el.textContent = Math.round(o.v); } });
}

// ---------------------------------------------------------------------------
// HERO intro
function buildHeroIntro() {
  const tl = gsap.timeline({ paused: true });
  if (reduced) return tl;
  const streaks = $$('.hero__streaks path');
  gsap.set(streaks, { drawSVG: '0%' });
  tl.to(streaks, { drawSVG: '100%', duration: 1.6, stagger: 0.18 }, 1);
  const split = SplitText.create('.hero__line', { type: 'chars', mask: 'chars' });
  gsap.set('.hero__title', { opacity: 1 });
  tl.from(split.chars, { yPercent: 110, duration: 1.6, stagger: 0.025, onComplete: () => split.revert() }, 0)
    .fromTo('.hero__sun', { clipPath: 'inset(100% -240px 0% -240px)', y: 40 }, { clipPath: 'inset(-100% -240px 0% -240px)', y: 0, duration: 1.6 }, 0.15)
    .from('.hero__sub', { y: 26, opacity: 0, duration: 1.6 }, 0.45)
    .from('.hero__ctas .btn', { y: 20, opacity: 0, duration: 1.6, stagger: 0.08 }, 0.6)
    .add(() => whileVisible(hero, gsap.to('.hero__sun', { y: -8, duration: 3.2, ease: 'sine.inOut', yoyo: true, repeat: -1 })), 1.7);

  if (sceneApi) {
    tl.to(canvas, { opacity: 1, duration: 0.7 }, 0.05)
      .to(sceneApi.state, { intro: 1, duration: 1.6 }, 0.05)
      // the street light switches on as it finishes rising: two quick blinks, then steady
      .to(sceneApi.state, { keyframes: [
        { ledGlow: 3.5, duration: 0.05, ease: 'none' }, { ledGlow: 0, duration: 0.09, ease: 'none' },
        { ledGlow: 3.5, duration: 0.05, ease: 'none' }, { ledGlow: 0.3, duration: 0.14, ease: 'none' },
        { ledGlow: 3.5, duration: 0.35, ease: 'power2.out' },
      ] }, 1.25);
  } else {
    tl.from('#anchor-streetlight img', { y: 40, opacity: 0, duration: 1.6 }, 0.1);
  }

  // callouts: leader lines draw out from the product, then boxes + text type in
  const leaders = $$('.leader');
  const outlines = $$('.callout__outline');
  gsap.set(leaders, { drawSVG: '0%' });
  gsap.set(outlines, { drawSVG: '0%' });
  gsap.set('.callout__corner, .callout__icon, .leader__node', { opacity: 0 });
  gsap.set('.callout [data-type]', { opacity: 0 });
  tl.to('.leader__node', { opacity: 1, duration: 0.3 }, 1.2)
    .to(leaders, { drawSVG: '100%', duration: 0.9, stagger: 0.12 }, 1.25)
    .add(() => gsap.set(leaders, { clearProps: 'strokeDasharray,strokeDashoffset' }), 2.3)
    .to(outlines, { drawSVG: '100%', duration: 0.8, stagger: 0.12 }, 1.9)
    .to('.callout__corner, .callout__icon', { opacity: 1, duration: 0.4, stagger: 0.05 }, 2.4)
    .add(() => {
      $$('.callout [data-type]').forEach((el, i) => { gsap.set(el, { opacity: 1 }); typeIn(el, { delay: i * 0.12 }); });
    }, 2.4);
  return tl;
}

// ---------------------------------------------------------------------------
// Panel choreography (§5.4) + Why SSG sequence
function buildChoreography() {
  const why = $('.why');
  const whyStage = $('.why__stage');
  const cards = $$('.why .card');
  const circuitLines = $$('.why .circuit__line');
  const pulses = $$('.why .circuit__pulse');
  const gridLines = $$('.why .solar-grid__lines path');
  const diamondsWhy = buildDiamonds($('.why .solar-grid__diamonds'), [613, 745, 876, 1007, 1139], [313, 447, 578]);
  const diamondsSun = buildDiamonds($('.sun .solar-grid__diamonds'), [630, 761, 893, 1024, 1157], [271, 401, 533]);

  // card frames with clipped corners
  cards.forEach((c) => {
    const art = c.querySelector('article');
    art.insertAdjacentHTML('afterbegin', '<svg class="card__frame" viewBox="0 0 210 169" preserveAspectRatio="none" aria-hidden="true"><path d="M9 .5H209.5V160L200.5 168.5H.5V9Z"/><path d="M.5 5L5 .5" /></svg>');
  });

  if (reduced) return;
  if (!desktopMotion) {
    gsap.from(cards, { y: 30, opacity: 0, duration: 0.8, stagger: 0.1, scrollTrigger: { trigger: '.why__cards', start: 'top 85%' } });
    gsap.from('.anchor--panel .anchor__fallback', { opacity: 0, y: 30, duration: 1, stagger: 0.2, scrollTrigger: { trigger: '.anchor--panel-why', start: 'top 85%' } });
    return;
  }

  // State A -> B: hero parallax + callouts fade as the panel detaches
  $$('.hero__line').forEach((line, i) => {
    gsap.to(line, { y: () => -(70 + i * 45) * (root.clientWidth / 1728), ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
  });
  gsap.to('.hero__aside', { y: () => -60 * (root.clientWidth / 1728), ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to(['.callout', '.hero__leaders'], { opacity: 0, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: () => `+=${innerHeight * 0.22}`, scrub: true } });

  // Pin Why SSG for ~150vh while the landing and card sequence play
  const pinLen = () => innerHeight * 1.5;
  const whyPin = ScrollTrigger.create({ trigger: why, start: 'top top', end: () => `+=${pinLen()}`, pin: true, anticipatePin: 1 });

  if (sceneApi) {
    // 0–70 % of this range happens before the pin; 70–100 % (landing) in the first part of the pin
    gsap.to(sceneApi.state, {
      detach: 1, ease: 'none',
      scrollTrigger: { start: 0, end: () => whyPin.start / 0.7, scrub: 1 },
    });
  }

  // State C: grid draws out, diamonds pop, circuit pulses reach each card
  gsap.set(cards, { opacity: 0, y: 30, filter: 'blur(10px)' });
  gsap.set(gridLines, { drawSVG: '50% 50%' });
  gsap.set(diamondsWhy, { scale: 0, transformOrigin: '50% 50%' });
  gsap.set(circuitLines, { drawSVG: '0%' });
  gsap.set(pulses, { drawSVG: '0% 0%', opacity: 0 });
  const icons = cards.map((c) => $$('.card__icon path', c));
  gsap.set(icons.flat(), { drawSVG: '0%', fillOpacity: 0 });
  gsap.set(cards, { '--on': 0 }); // icon + status dot turn gold when the pulse arrives

  const tlC = gsap.timeline({
    scrollTrigger: { trigger: why, start: () => whyPin.start + innerHeight * 0.5, end: () => whyPin.end - innerHeight * 0.05, scrub: 1 },
  });
  tlC.to(gridLines, { drawSVG: '0% 100%', duration: 1, stagger: 0.05 }, 0)
    .to(diamondsWhy, { scale: 1, duration: 0.5, stagger: { each: 0.03, from: 'center' } }, 0.3);
  cards.forEach((card, i) => {
    const at = 0.8 + i * 0.35;
    tlC.to(circuitLines[i], { drawSVG: '100%', duration: 0.8, ease: 'none' }, at)
      .to(pulses[i], { opacity: 1, duration: 0.05 }, at)
      .fromTo(pulses[i], { drawSVG: '0% 0%' }, { drawSVG: '92% 100%', duration: 0.8, ease: 'none', immediateRender: false }, at)
      .to(pulses[i], { opacity: 0, duration: 0.15 }, at + 0.8)
      .to(card, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.5 }, at + 0.7)
      .to(icons[i], { drawSVG: '100%', duration: 0.5, stagger: 0.05, ease: 'none' }, at + 0.8)
      .to(icons[i], { fillOpacity: 1, duration: 0.3 }, at + 1.2)
      .to(card, { '--on': 1, duration: 0.2 }, at + 1.1);
  });
  tlC.to({}, { duration: 0.4 });

  // idle pulses along the circuits once the cards are on
  let idle;
  ScrollTrigger.create({
    trigger: why, start: () => whyPin.end - innerHeight * 0.05, end: () => whyPin.end + innerHeight,
    onToggle: (self) => {
      idle?.kill();
      if (!self.isActive) return;
      idle = gsap.timeline({ repeat: -1, repeatDelay: 1.2 });
      pulses.forEach((p, i) => {
        idle.fromTo(p, { drawSVG: '0% 0%', opacity: 1 }, { drawSVG: '94% 100%', duration: 1.2, ease: 'power1.inOut', immediateRender: false }, i * 0.45)
          .to(p, { opacity: 0, duration: 0.2 }, i * 0.45 + 1.1);
      });
    },
  });

  // constant energy flow along the grid into the panel, once the grid has drawn
  const flowWhy = buildEnergyFlow($('.why .solar-grid'), [876, 447]);
  ScrollTrigger.create({
    trigger: why, start: () => whyPin.start + innerHeight * 0.75, end: () => whyPin.end + innerHeight,
    onToggle: (self) => (self.isActive ? flowWhy.start() : flowWhy.stop()),
  });

  // card hover: 3D tilt (max 6°), circuit brightens, panel cell row glints
  cards.forEach((card, i) => {
    const rx = gsap.quickTo(card, 'rotationX', { duration: 0.5, ease: 'power3.out' });
    const ry = gsap.quickTo(card, 'rotationY', { duration: 0.5, ease: 'power3.out' });
    gsap.set(card, { transformPerspective: 700 });
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      ry(px * 12); rx(-py * 12);
    });
    card.addEventListener('pointerenter', () => { circuitLines[i].classList.add('is-hot'); sceneApi?.glint(i); });
    card.addEventListener('pointerleave', () => { rx(0); ry(0); circuitLines[i].classList.remove('is-hot'); });
  });

  // State E: the panel returns from behind the National Flag section
  const sun = $('.sun');
  if (sceneApi) {
    ScrollTrigger.create({
      trigger: sun, start: 'top 80%',
      onEnter: () => { sceneApi.state.sunMode = true; },
      onLeaveBack: () => { sceneApi.state.sunMode = false; },
    });
    gsap.to(sceneApi.state, { sun: 1, ease: 'none', scrollTrigger: { trigger: sun, start: 'top 80%', end: 'top 12%', scrub: 1 } });
  }
  const sunLines = $$('.sun .solar-grid__lines path');
  gsap.set(sunLines, { drawSVG: '50% 50%' });
  gsap.set(diamondsSun, { scale: 0, transformOrigin: '50% 50%' });
  const sunTitle = SplitText.create('.sun__line', { type: 'lines', mask: 'lines' });
  gsap.set(sunTitle.lines, { xPercent: 105 });
  gsap.timeline({ scrollTrigger: { trigger: sun, start: 'top 22%', toggleActions: 'play none none reverse' } })
    .to(sunLines, { drawSVG: '0% 100%', duration: 1.6, stagger: 0.05 }, 0)
    .to(diamondsSun, { scale: 1, duration: 0.5, stagger: { each: 0.03, from: 'center' } }, 0.3)
    .to(sunTitle.lines, { xPercent: 0, duration: 1.6, stagger: 0.1 }, 0.1);
  const flowSun = buildEnergyFlow($('.sun .solar-grid'), [893, 401]);
  ScrollTrigger.create({
    trigger: sun, start: 'top 22%', end: 'bottom top',
    onToggle: (self) => (self.isActive ? flowSun.start() : flowSun.stop()),
  });
}

function buildDiamonds(group, xs, ys) {
  if (!group) return [];
  const out = [];
  ys.forEach((y) => xs.forEach((x) => {
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', `M${x} ${y - 8.24}L${x + 8.24} ${y}L${x} ${y + 8.24}L${x - 8.24} ${y}Z`);
    group.appendChild(p);
    out.push(p);
  }));
  return out;
}

// ---------------------------------------------------------------------------
// Energy flow: waves of light run along the grid lines into the panel, as if it's charging
function buildEnergyFlow(svg, [cx, cy]) {
  const NS = 'http://www.w3.org/2000/svg';
  const flow = document.createElementNS(NS, 'g');
  flow.setAttribute('class', 'solar-grid__flow');
  svg.insertBefore(flow, $('.solar-grid__diamonds', svg));
  // every grid line becomes two runs, one from each end, meeting under the panel's centre
  const runs = [];
  $$('.solar-grid__lines path', svg).forEach((line) => {
    const [, x, y, dir, to] = line.getAttribute('d').match(/M([\d.]+) ([\d.]+)([VH])([\d.]+)/).map((v, i) => (i === 3 ? v : +v));
    const starts = dir === 'V' ? [[x, y], [x, to]] : [[x, y], [to, y]];
    const [ex, ey] = dir === 'V' ? [x, cy] : [cx, y];
    starts.forEach(([sx, sy]) => {
      const path = document.createElementNS(NS, 'path');
      path.setAttribute('d', `M${sx} ${sy}L${ex} ${ey}`);
      path.setAttribute('class', 'solar-grid__pulse');
      flow.appendChild(path);
      runs.push(path);
    });
  });
  gsap.set(runs, { drawSVG: '0% 0%', opacity: 0 });

  const RUN = 1.1;   // seconds for a pulse's head to reach the centre
  const TAIL = 0.2;  // pulse length, as a share of the run
  let next = null;
  function wave() {
    gsap.utils.shuffle(runs.slice()).slice(0, 4).forEach((path, k) => {
      const head = { t: 0 };
      gsap.to(head, {
        t: 1 + TAIL, duration: RUN * (1 + TAIL), delay: k * 0.14, ease: 'none',
        onStart: () => gsap.set(path, { opacity: 1 }),
        onUpdate: () => gsap.set(path, { drawSVG: `${Math.max(0, head.t - TAIL) * 100}% ${Math.min(1, head.t) * 100}%` }),
        onComplete: () => gsap.set(path, { opacity: 0 }),
      });
    });
    next = gsap.delayedCall(1.4 + Math.random() * 0.6, wave);
  }
  return {
    start() { if (!next) wave(); },
    stop() { next?.kill(); next = null; },
  };
}

// ---------------------------------------------------------------------------
// Default section reveals
function buildReveals() {
  if (reduced) return;
  $$('[data-split]').forEach((el) => {
    const split = SplitText.create(el, { type: 'lines', mask: 'lines' });
    gsap.from(split.lines, {
      yPercent: 110, duration: 1.6, stagger: 0.08,
      scrollTrigger: { trigger: el, start: 'top 86%', toggleActions: toggle },
    });
  });
  $$('[data-fade]').forEach((el) => {
    gsap.fromTo(el, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 1.6, scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: toggle } });
  });
  $$('[data-type]').forEach((el) => {
    if (el.closest('.callout')) return;
    const tw = typeIn(el, { paused: true });
    ScrollTrigger.create({ trigger: el, start: 'top 92%', once: true, onEnter: () => tw.play() });
  });

  // Why SSG title rules
  gsap.from('.why__rule', { scaleX: 0, duration: 1.6, scrollTrigger: { trigger: '.why__title', start: 'top 85%' } });

  // gold seam lines draw out from the middle as the seam enters, then drift slowly
  $$('.seam').forEach((svg) => {
    const paths = $$('path', svg);
    gsap.fromTo(paths, { drawSVG: '50% 50%' }, {
      drawSVG: '0% 100%', duration: 1.6, stagger: 0.14,
      scrollTrigger: { trigger: svg, start: 'top 92%', toggleActions: toggle },
    });
    paths.forEach((p, i) => whileVisible(svg, gsap.to(p, {
      x: i % 2 ? 14 : -14, y: i % 2 ? -5 : 5, duration: 6 + i * 1.6, ease: 'sine.inOut', yoyo: true, repeat: -1,
    })));
  });
}

// ---------------------------------------------------------------------------
// Mission
function buildMission() {
  const tiles = $$('.mission .tile');
  const imgs = $$('.mission .tile__img');
  const stats = $('.mission__stats');
  if (reduced) return;
  // the windows wipe open one after another (top row upward, bottom row downward)
  // while the photo behind them zooms out as one picture
  const tl = gsap.timeline({ scrollTrigger: { trigger: '.mission__mosaic', start: 'top 78%', toggleActions: toggle } });
  tl.fromTo(tiles, { clipPath: (i) => (i < 3 ? 'inset(100% 0% 0% 0%)' : 'inset(0% 0% 100% 0%)') }, {
    clipPath: 'inset(0% 0% 0% 0%)', duration: 1.6, stagger: 0.12,
  }, 0)
    .fromTo(imgs, { scale: 1.35 }, { scale: 1, duration: 2.4 }, 0.1);
  // the photo drifts behind the fixed windows while the section scrolls
  if (desktopMotion) {
    gsap.fromTo(imgs, { yPercent: -4.5 }, {
      yPercent: 4.5, ease: 'none',
      scrollTrigger: { trigger: '.mission', start: 'top bottom', end: 'bottom top', scrub: true },
    });
  }
  gsap.from('.stat__rule', { scaleY: 0, duration: 1.6, stagger: 0.15, scrollTrigger: { trigger: stats, start: 'top 85%' } });
  const gem = $('[data-typein]');
  const gemTw = typeIn(gem, { paused: true, stagger: 0.09 });
  const counts = $$('.mission .count');
  counts.forEach((c) => { c.textContent = '0'; });
  ScrollTrigger.create({
    trigger: stats, start: 'top 96%', once: true,
    onEnter: () => { gemTw.play(); counts.forEach((c) => countUp(c)); },
  });
  gsap.from('.stat__label', { y: 20, opacity: 0, duration: 1.6, stagger: 0.1, scrollTrigger: { trigger: stats, start: 'top 85%' } });
}

// ---------------------------------------------------------------------------
// National Flag
function buildFlag() {
  const section = $('.flag');
  const flagState = initFlag({ section, reduced: reduced || mobile });
  if (reduced) return;
  const banner = $('.flag__banner');
  const bannerInner = $('.flag__banner-inner');
  const dim = $('.flag__dimension');
  const dimCount = $('.count', dim);
  const count = { v: 0 };
  dimCount.textContent = '0';

  // clouds drift slowly while the section is on screen (in %, so the edge never shows at any width)
  whileVisible(section, gsap.fromTo('.flag__sky', { xPercent: -1.5 }, { xPercent: 1.5, duration: 7, ease: 'sine.inOut', yoyo: true, repeat: -1 }));
  gsap.set($$('path', dim), { drawSVG: '0%' });
  // everything here moves on the GPU: the banner opens from the bottom as a sliding mask
  // (the frame moves up while its content moves down by the same amount), not a repainted clip-path
  const tl = gsap.timeline({ scrollTrigger: { trigger: section, start: mobile ? 'top 70%' : 'top 62%', toggleActions: toggle } });
  tl.fromTo(banner, { yPercent: 100 }, { yPercent: 0, duration: 1.6 }, 0)
    .fromTo(bannerInner, { yPercent: -100 }, { yPercent: 0, duration: 1.6 }, 0)
    .fromTo('.flag__flag', { y: 70, opacity: 0 }, { y: 0, opacity: 1, duration: 1.9 }, 0.3)
    .to($('.dim__line', dim), { drawSVG: '100%', duration: 1.6 }, 0.9)
    .to($('.dim__cap', dim), { drawSVG: '100%', duration: 0.4 }, 0.9)
    // a tween (not a callback), so scrolling back up counts down instead of restarting
    .to(count, { v: 100, duration: 1.6, onUpdate: () => { dimCount.textContent = Math.round(count.v); } }, 0.9)
    .from('.flag__dimension > span', { opacity: 0, x: -8, duration: 0.5 }, 0.9)
    .fromTo('.flag__project', { y: 90, opacity: 0 }, { y: 0, opacity: 1, duration: 1.6 }, 0.75);
  // the cloth starts to wave as the flag settles (WebGL flag only; phones show the still image)
  if (flagState) tl.to(flagState, { amp: 1, duration: 2.6, ease: 'sine.inOut' }, 0.5);
}

// ---------------------------------------------------------------------------
// Logos
function buildLogos() {
  const row = $('.logos__row');
  const logos = $$('.logo', row);
  if (!reduced) {
    gsap.fromTo(logos, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 1.6, stagger: 0.08, scrollTrigger: { trigger: '.logos', start: 'top 85%', toggleActions: toggle } });
  }
  if (window.innerWidth < 1200 && !reduced) {
    logos.forEach((l) => { const c = l.cloneNode(true); c.setAttribute('aria-hidden', 'true'); c.querySelector('img').alt = ''; row.appendChild(c); });
    row.classList.add('is-marquee');
    whileVisible($('.logos'), gsap.to(row, { xPercent: -50, duration: 32, ease: 'none', repeat: -1, force3D: true }));
  }
}

// ---------------------------------------------------------------------------
// Nav: the link for the section you're reading is marked current; mobile menu toggle
function buildNav() {
  const links = $$('.nav__link, .nav__mobile a');
  const targets = [...new Set(links.map((a) => a.getAttribute('href')))]
    .map((h) => $(h)).filter(Boolean)
    .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
  let currentId = null;
  // section tops are measured once per layout (ScrollTrigger refresh), not on every scroll frame
  let tops = [];
  const measure = () => { tops = targets.map((t) => ({ id: t.id, top: t.getBoundingClientRect().top + window.scrollY })); };
  const update = () => {
    // the last linked section whose top has passed the middle of the screen
    // (sections without a link, like Why SSG, keep the one above them current)
    const line = window.scrollY + window.innerHeight * 0.5;
    let id = tops[0]?.id;
    tops.forEach((t) => { if (t.top <= line) id = t.id; });
    if (id === currentId) return;
    currentId = id;
    links.forEach((a) => {
      if (a.getAttribute('href') === `#${id}`) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    });
  };
  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: update, onRefresh: () => { measure(); update(); } });
  measure();
  update();
  const burger = $('.nav__burger');
  const menu = $('#mobile-menu');
  burger?.addEventListener('click', () => {
    const open = burger.getAttribute('aria-expanded') !== 'true';
    burger.setAttribute('aria-expanded', String(open));
    menu.hidden = !open;
  });
  menu?.addEventListener('click', (e) => { if (e.target.closest('a')) { burger.setAttribute('aria-expanded', 'false'); menu.hidden = true; } });
}

// ---------------------------------------------------------------------------
// Pointer position feeds the 3D scene's subtle parallax
function trackPointer() {
  if (!finePointer) return;
  window.addEventListener('pointermove', (e) => {
    if (!sceneApi) return;
    sceneApi.state.pointerX = (e.clientX / window.innerWidth - 0.5) * 2;
    sceneApi.state.pointerY = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });
}

// ---------------------------------------------------------------------------
// Links, enquiry modal, toasts
const dialog = $('#quote');
const form = $('.quote__form', dialog);
const note = $('.quote__note', dialog);

function toast(msg) {
  let t = $('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast mono'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.textContent = msg;
  gsap.fromTo(t, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, overwrite: true });
  gsap.to(t, { y: 20, opacity: 0, duration: 0.4, delay: 2.6 });
}

function openQuote(product = '') {
  form.reset();
  note.textContent = '';
  form.elements.product.value = product;
  dialog.showModal();
  lenis?.stop();
  setTimeout(() => form.elements.name.focus(), 50);
}
dialog.addEventListener('close', () => lenis?.start());
$('.quote__close', dialog).addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const f = form.elements;
  if (!f.name.value.trim() || !f.phone.value.trim()) {
    note.textContent = 'Please add your name and phone number.';
    (f.name.value.trim() ? f.phone : f.name).focus();
    return;
  }
  const subject = `Quote request${f.product.value ? `: ${f.product.value}` : ''}`;
  const body = [
    `Name: ${f.name.value}`, `Organisation: ${f.org.value}`, `Phone: ${f.phone.value}`, `Email: ${f.email.value}`,
    `Product: ${f.product.value}`, '', f.message.value,
  ].join('\n');
  // TODO: replace mailto with the client's form endpoint / CRM
  window.location.href = `mailto:shyaminfratech.co.in@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  note.textContent = 'Opening your email app with the enquiry…';
  setTimeout(() => dialog.close(), 1600);
});

function enquire(product, fromEl) {
  const contact = $('#contact');
  if (fromEl && contact.contains(fromEl)) { openQuote(product); return; }
  scrollToTarget(contact, () => openQuote(product));
}

document.addEventListener('click', (e) => {
  const enq = e.target.closest('[data-enquire]');
  if (enq && !enq.closest('.products')) { e.preventDefault(); enquire(enq.dataset.enquire, enq); return; }
  const todo = e.target.closest('[data-todo], [data-brochure]');
  if (todo) {
    e.preventDefault();
    toast(todo.hasAttribute('data-brochure') ? 'Brochure PDF coming soon' : 'Link coming soon');
    return;
  }
  const a = e.target.closest('a[href^="#"]');
  if (a && a.getAttribute('href').length > 1) {
    const target = $(a.getAttribute('href'));
    if (target) { e.preventDefault(); scrollToTarget(target); }
  }
});

// ---------------------------------------------------------------------------
// Boot
async function boot() {
  setProgress(0.04);
  await Promise.all([fontsReady, load3D()]);
  setProgress(1);

  const heroIntro = buildHeroIntro();
  buildChoreography();
  buildReveals();
  initProducts({ gsap, ScrollTrigger, SplitText, lenis, native: mobile || reduced, onEnquire: (p) => enquire(p) });
  buildMission();
  buildFlag();
  buildLogos();
  initProcess({ gsap, ScrollTrigger, reduced, touch: !finePointer, whileVisible });
  buildNav();
  trackPointer();
  // heavy media is only fetched once its section is getting close
  const near = (sel, fn) => ScrollTrigger.create({ trigger: sel, start: 'top 250%', once: true, onEnter: fn });
  near('.mission', () => $('.mission').classList.add('is-near'));
  near('.cta', () => initCtaSkyline({ gsap, ScrollTrigger, reduced, finePointer, whileVisible }));
  near('.footer', () => initFooterLandscape({ gsap, ScrollTrigger, reduced, finePointer, whileVisible }));
  ScrollTrigger.refresh();

  // preloader out: the logo bows out, a seam draws down the middle and the screen splits open like two doors
  await new Promise((r) => setTimeout(r, 450));
  const out = gsap.timeline({
    onComplete: () => {
      preloader.remove();
      document.body.classList.remove('is-loading');
      lenis?.start();
      ScrollTrigger.refresh();
    },
  });
  if (reduced) {
    out.to(preloader, { opacity: 0, duration: 0.3 });
    if (sceneApi) gsap.set(canvas, { opacity: 1 });
  } else {
    // the logo and battery bow out in one piece, then the empty screen splits open
    const inner = $('.preloader__inner', preloader);
    const panels = ['l', 'r'].map((side) => {
      const panel = document.createElement('div');
      panel.className = `preloader__panel preloader__panel--${side}`;
      preloader.appendChild(panel);
      return panel;
    });
    const seam = document.createElement('span');
    seam.className = 'preloader__seam';
    preloader.appendChild(seam);
    preloader.classList.add('is-splitting');
    out.to('.preloader__pct', { opacity: 0, duration: 0.2 })
      .to(inner, { opacity: 0, scale: 0.94, duration: 0.45 }, 0.05)
      .fromTo(seam, { scaleY: 0 }, { scaleY: 1, duration: 0.45 }, 0.3)
      .to(panels[0], { xPercent: -100, duration: 1.6 }, 0.7)
      .to(panels[1], { xPercent: 100, duration: 1.6 }, 0.7)
      .to(seam, { opacity: 0, duration: 0.25 }, 0.75)
      .add(() => heroIntro.play(), 1);
  }
}

boot().catch((err) => {
  staticFallback(err);
  lenis?.start();
});
})();
