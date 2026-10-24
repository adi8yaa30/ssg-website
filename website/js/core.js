/* ==========================================================================
   SSG shared core: everything both pages (index.html, about.html) use.
   GSAP + plugins and the site's one motion curve ('ssg'), Lenis, the
   preloader, nav, toasts, the enquiry modal, link handling, the page
   transition between pages, and the small reveal helpers (typeIn, countUp).
   A page script calls SSG.initCore({ page }) once and gets these back.
   ========================================================================== */
(function () {
window.SSG = window.SSG || {};

/* Local-file support: when a page is opened straight from disk (file://), browsers block fetch()
   of local files. Heavy assets then come from small companion scripts (<file>.js, written by
   tools/embed-local-assets.py) that register their content here. Used by scene.js and scanlines.js. */
const isFile = location.protocol === 'file:';
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}
async function readLocal(path) {
  window.__SSG_FILES = window.__SSG_FILES || {};
  if (!(path in window.__SSG_FILES)) await loadScript(`${path}.js`);
  return window.__SSG_FILES[path];
}
window.SSG.isFile = isFile;
window.SSG.loadScript = loadScript;
window.SSG.readLocal = readLocal;

const TRANSITION_KEY = 'ssg-wipe';

function initCore({ page = 'home' } = {}) {
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
  if (!gsap || !ScrollTrigger) {
    staticFallback('scripts unavailable');
    return null;
  }

  gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin, CustomEase);
  // the site's one motion curve; entrances run 1.6s on it (scroll-linked tweens and ambient loops opt out)
  CustomEase.create('ssg', '0.4,0.01,0.04,1');
  gsap.defaults({ ease: 'ssg' });
  // mobile browsers resize the viewport as the address bar slides; don't re-measure every trigger for that
  ScrollTrigger.config({ ignoreMobileResize: true });
  if (reduced) root.classList.add('reduced-motion');

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

  document.body.classList.add('is-loading');

  // ---- Smooth scroll (Lenis, synced with ScrollTrigger)
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
  // land on a #section after the page is built (deep links such as index.html#products)
  function scrollToHash() {
    const target = location.hash.length > 1 && document.getElementById(location.hash.slice(1));
    if (!target) return;
    const y = target.getBoundingClientRect().top + window.scrollY;
    if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
    else window.scrollTo(0, y);
    ScrollTrigger.update();
  }

  // ---- Preloader: the battery bar fills, then the screen splits open (or, after a page
  // transition, the night lifts with the gold horizon line sweeping up)
  const preloader = $('#preloader');
  const pctEl = $('#preloader-pct');
  const fills = $$('.preloader__fill');
  const progress = { v: 0 };
  function renderProgress() {
    gsap.set(fills[0], { scaleX: Math.min(1, progress.v * 2) });
    gsap.set(fills[1], { scaleX: Math.max(0, Math.min(1, progress.v * 2 - 1)) });
    if (pctEl) pctEl.textContent = Math.round(progress.v * 100);
  }
  function setProgress(p, duration = 0.5) {
    return gsap.to(progress, { v: Math.max(progress.v, p), duration, overwrite: true, onUpdate: renderProgress });
  }
  let arrivedByWipe = false;
  try { arrivedByWipe = sessionStorage.getItem(TRANSITION_KEY) === '1'; sessionStorage.removeItem(TRANSITION_KEY); } catch { /* private mode */ }

  // `onStart` runs as it begins (so whatever is underneath is already drawing), `onOpen` once it has parted
  function openPreloader({ onStart = () => {}, onOpen = () => {} } = {}) {
    return new Promise((resolve) => {
      const out = gsap.timeline({
        onComplete: () => {
          preloader.remove();
          document.body.classList.remove('is-loading');
          ScrollTrigger.refresh();
          // pin spacers may appear after Lenis last measured the page
          lenis?.resize();
          lenis?.start();
          resolve();
        },
      });
      onStart();
      if (reduced) {
        out.to(preloader, { opacity: 0, duration: 0.3 }).add(onOpen);
        return;
      }
      const inner = $('.preloader__inner', preloader);
      if (arrivedByWipe) {
        // continuing the page transition: the night lifts away under a rising gold horizon line
        const line = document.createElement('span');
        line.className = 'preloader__horizon';
        preloader.appendChild(line);
        out.to(inner, { opacity: 0, duration: 0.3 })
          .to(preloader, { yPercent: -100, duration: 1.1 }, 0.2)
          .add(onOpen, 0.55);
        return;
      }
      // the logo and battery bow out in one piece, then the empty screen splits open
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
        .add(onOpen, 1);
    });
  }

  const fontsReady = (document.fonts ? document.fonts.ready : Promise.resolve()).catch(() => {});
  // Load the page's faces explicitly (fonts.ready resolves early for content that isn't rendered yet)
  const pageFonts = () => (document.fonts ? Promise.all(
    ['400 1em Unbounded', '400 1em "Instrument Sans"', '500 1em "Instrument Sans"', '400 1em "Space Mono"'].map((f) => document.fonts.load(f))
  ).catch(() => {}) : Promise.resolve());

  // ---- Small reveal helpers
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

  // ---- The default reveals both pages use: [data-split] headings rise line by line from a mask,
  // [data-fade] blocks fade up, [data-type] mono labels type in. `skip` excludes elements inside it.
  function basicReveals({ skip = null, scope = document } = {}) {
    if (reduced) return;
    const keep = (el) => !(skip && el.closest(skip));
    $$('[data-split]', scope).filter(keep).forEach((el) => {
      const split = SplitText.create(el, { type: 'lines', mask: 'lines' });
      gsap.from(split.lines, {
        yPercent: 110, duration: 1.6, stagger: 0.08,
        scrollTrigger: { trigger: el, start: 'top 86%', toggleActions: toggle },
      });
    });
    $$('[data-fade]', scope).filter(keep).forEach((el) => {
      gsap.fromTo(el, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 1.6, scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: toggle } });
    });
    $$('[data-type]', scope).filter(keep).forEach((el) => {
      const tw = typeIn(el, { paused: true });
      ScrollTrigger.create({ trigger: el, start: 'top 92%', once: true, onEnter: () => tw.play() });
    });
  }

  // ---- Nav: on the home page the link for the section you're reading is marked current;
  // on another page that page's link is. Plus the mobile menu toggle.
  function buildNav() {
    const links = $$('.nav__link, .nav__mobile a');
    if (page !== 'home') {
      links.forEach((a) => { if (a.getAttribute('href') === `${page}.html`) a.setAttribute('aria-current', 'page'); });
    } else {
      const targets = [...new Set(links.map((a) => a.getAttribute('href')).filter((h) => h.startsWith('#')))]
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
          else if (a.getAttribute('aria-current') === 'location') a.removeAttribute('aria-current');
        });
      };
      ScrollTrigger.create({ start: 0, end: 'max', onUpdate: update, onRefresh: () => { measure(); update(); } });
      measure();
      update();
    }
    const burger = $('.nav__burger');
    const menu = $('#mobile-menu');
    burger?.addEventListener('click', () => {
      const open = burger.getAttribute('aria-expanded') !== 'true';
      burger.setAttribute('aria-expanded', String(open));
      menu.hidden = !open;
    });
    menu?.addEventListener('click', (e) => { if (e.target.closest('a')) { burger.setAttribute('aria-expanded', 'false'); menu.hidden = true; } });
  }

  // ---- Page transition: leaving for the other page, a night panel rises over the screen
  // under a sweeping gold horizon line; the next page's preloader lifts it away again
  function leaveTo(href) {
    try { sessionStorage.setItem(TRANSITION_KEY, '1'); } catch { /* the next page just splits open */ }
    if (reduced) { location.href = href; return; }
    lenis?.stop();
    const wipe = document.createElement('div');
    wipe.className = 'page-wipe';
    wipe.innerHTML = '<span class="page-wipe__line"></span>';
    document.body.appendChild(wipe);
    gsap.fromTo(wipe, { yPercent: 100 }, { yPercent: 0, duration: 0.9, ease: 'power3.inOut', onComplete: () => { location.href = href; } });
  }
  // coming back with the browser's back button restores a frozen page: drop a leftover wipe
  window.addEventListener('pageshow', (e) => { if (e.persisted) { $$('.page-wipe').forEach((w) => w.remove()); lenis?.start(); } });

  // ---- Toasts, enquiry modal
  function toast(msg) {
    let t = $('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast mono'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg;
    gsap.fromTo(t, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, overwrite: true });
    gsap.to(t, { y: 20, opacity: 0, duration: 0.4, delay: 2.6 });
  }

  const dialog = $('#quote');
  const form = dialog && $('.quote__form', dialog);
  const note = dialog && $('.quote__note', dialog);
  function openQuote(product = '') {
    if (!dialog) return;
    form.reset();
    note.textContent = '';
    form.elements.product.value = product;
    dialog.showModal();
    lenis?.stop();
    setTimeout(() => form.elements.name.focus(), 50);
  }
  if (dialog) {
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
  }

  function enquire(product, fromEl) {
    const contact = $('#contact');
    if (!contact || (fromEl && contact.contains(fromEl))) { openQuote(product); return; }
    scrollToTarget(contact, () => openQuote(product));
  }

  // ---- Links: enquiries, "coming soon" links, same-page anchors (smooth) and the other page (transition)
  document.addEventListener('click', (e) => {
    const enq = e.target.closest('[data-enquire]');
    if (enq && !enq.closest('.products')) { e.preventDefault(); enquire(enq.dataset.enquire, enq); return; }
    const todo = e.target.closest('[data-todo], [data-brochure]');
    if (todo) {
      e.preventDefault();
      toast(todo.hasAttribute('data-brochure') ? 'Brochure PDF coming soon' : 'Link coming soon');
      return;
    }
    const a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank') return;
    const href = a.getAttribute('href');
    if (href.startsWith('#') && href.length > 1) {
      const target = $(href);
      if (target) { e.preventDefault(); scrollToTarget(target); }
      return;
    }
    // another page of this site (index.html, about.html, with or without a #section)
    if (/^[\w-]+\.html(#[\w-]*)?$/.test(href)) {
      const [file, hash] = href.split('#');
      const here = location.pathname.split('/').pop() || 'index.html';
      if (file === here && hash) {
        const target = document.getElementById(hash);
        if (target) { e.preventDefault(); scrollToTarget(target); }
        return;
      }
      if (file !== here) { e.preventDefault(); leaveTo(href); }
    }
  });

  const core = {
    gsap, ScrollTrigger, SplitText, lenis, root, $, $$,
    reduced, mobile, finePointer, debug, desktopMotion, toggle,
    staticFallback, whileVisible, scrollToTarget, scrollToHash,
    setProgress, openPreloader, fontsReady, pageFonts,
    typeIn, countUp, basicReveals, buildNav, toast, openQuote, enquire, leaveTo,
  };
  if (debug) window.__ssg = Object.assign(window.__ssg || {}, { gsap, ScrollTrigger, lenis, core });
  return core;
}

window.SSG.initCore = initCore;
})();
