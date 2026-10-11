(function () {
/* ==========================================================================
   Our Products: products stand on one continuous strip of grass, shown one
   at a time. The ← → buttons, the arrow keys and drag walk along the land;
   the page scroll is never hijacked.
   On mobile / reduced motion it falls back to a native swipe carousel.
   ========================================================================== */
function initProducts({ gsap, ScrollTrigger, SplitText, lenis, native, onEnquire }) {
  const section = document.querySelector('.products');
  if (!section) return;
  const pin = section.querySelector('.products__pin');
  const viewport = section.querySelector('.products__viewport');
  const track = section.querySelector('.products__track');
  const slides = [...track.querySelectorAll('.slide')];
  const n = slides.length;
  const statusEl = section.querySelector('.products__status');
  const [prevBtn, nextBtn] = section.querySelectorAll('.products__arrow');
  let index = 0;

  section.querySelectorAll('[data-enquire]').forEach((b) => b.addEventListener('click', () => onEnquire(b.dataset.enquire)));

  // ---- View Product: a modal built from the slide's own content -----------
  const view = document.getElementById('product-view');
  const $v = (sel) => view.querySelector(sel);
  const text = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');
  function openProduct(slide) {
    const i = slides.indexOf(slide);
    const photo = slide.querySelector('.slide__photo img');
    const blueprint = slide.querySelector('.slide__blueprint img');
    $v('.pview__kicker').textContent = `// PRODUCT ${String(i + 1).padStart(2, '0')} / ${String(n).padStart(2, '0')}`;
    $v('.pview__title').textContent = slide.dataset.name;
    $v('.pview__desc').textContent = text(slide.querySelector('.slide__desc'));
    // spec lines with the count-up numbers at their final values
    $v('.pview__specs').replaceChildren(...[...slide.querySelectorAll('.slide__specs li')].map((li) => {
      const c = li.cloneNode(true);
      c.querySelectorAll('.count').forEach((s) => { s.textContent = s.dataset.format === 'comma' ? Number(s.dataset.to).toLocaleString('en-IN') : s.dataset.to; });
      return c;
    }));
    $v('.pview__tags').replaceChildren(...[...slide.querySelectorAll('.slide__tags span')].map((s) => s.cloneNode(true)));
    $v('.pview__photo img').src = photo.getAttribute('src');
    $v('.pview__photo img').alt = photo.alt;
    $v('.pview__blueprint').hidden = !blueprint;
    if (blueprint) { $v('.pview__blueprint img').src = blueprint.getAttribute('src'); $v('.pview__blueprint img').alt = blueprint.alt; }
    $v('.pview__chem').textContent = text(slide.querySelector('.slide__chem'));
    $v('.pview__lines').replaceChildren(...[...slide.querySelectorAll('.slide__lines li')].map((li) => li.cloneNode(true)));
    $v('.pview__quote').dataset.product = slide.dataset.name;
    view.showModal();
    lenis?.stop();
  }
  section.querySelectorAll('[data-view-product]').forEach((b) => b.addEventListener('click', () => openProduct(b.closest('.slide'))));
  view.addEventListener('close', () => lenis?.start());
  $v('.quote__close').addEventListener('click', () => view.close());
  view.addEventListener('click', (e) => { if (e.target === view) view.close(); });
  $v('.pview__quote').addEventListener('click', (e) => {
    view.close();
    lenis?.start(); // the close event fires later; Lenis ignores scrollTo while stopped
    onEnquire(e.currentTarget.dataset.product);
  });

  function setIndex(i) {
    i = Math.max(0, Math.min(n - 1, i));
    if (i === index) return;
    index = i;
    statusEl.textContent = `Product ${i + 1} of ${n}: ${slides[i].dataset.name}`;
    slides.forEach((s, k) => s.classList.toggle('is-current', k === i));
  }
  index = -1;
  setIndex(0);
  // the arrows (and arrow keys) loop: next on the last product returns to the first
  const wrap = (i) => (i + n) % n;

  // ---- per-slide entrance -------------------------------------------------
  function slideTimeline(slide) {
    const tl = gsap.timeline({ paused: true });
    const name = slide.querySelector('.slide__name');
    const split = SplitText.create(name, { type: 'lines', mask: 'lines', linesClass: 'split-line' });
    const card = slide.querySelector('.slide__card');
    const tags = slide.querySelectorAll('.slide__tags span');
    const blueprint = slide.querySelector('.slide__blueprint');
    const rightRest = slide.querySelectorAll('.slide__iconrow, .slide__lines li');
    const cta = slide.querySelector('.slide__cta');
    const dim = slide.querySelector('.slide__dimension');
    const counts = [...slide.querySelectorAll('.count')];

    tl.from(split.lines, { yPercent: 110, duration: 1.6, stagger: 0.08 }, 0)
      .from(card, { y: 50, opacity: 0, duration: 1.6 }, 0.08)
      .add(() => countUp(counts), 0.2)
      .from(tags, { y: 16, opacity: 0, duration: 1.6, stagger: 0.06 }, 0.16)
      .fromTo(blueprint, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 1.6 }, 0.24)
      .from(rightRest, { y: 14, opacity: 0, duration: 1.6, stagger: 0.05 }, 0.34)
      .from(cta, { y: 20, opacity: 0, duration: 1.6 }, 0.4);
    if (dim) {
      tl.fromTo(dim.querySelector('.dim__line'), { drawSVG: '0%' }, { drawSVG: '100%', duration: 1.6 }, 0.3)
        .from(dim.querySelector('span'), { opacity: 0, duration: 0.4 }, 1.4);
    }
    return tl;
  }

  function countUp(els) {
    els.forEach((c) => {
      const to = parseFloat(c.dataset.to);
      const comma = c.dataset.format === 'comma';
      const o = { v: 0 };
      gsap.to(o, {
        v: to, duration: 1.6,
        onUpdate: () => { const v = Math.round(o.v); c.textContent = comma ? v.toLocaleString('en-IN') : v; },
      });
    });
  }

  if (native) {
    // ---- swipe carousel ---------------------------------------------------
    const go = (i) => viewport.scrollTo({ left: slides[Math.max(0, Math.min(n - 1, i))].offsetLeft, behavior: 'smooth' });
    prevBtn.addEventListener('click', () => go(wrap(index - 1)));
    nextBtn.addEventListener('click', () => go(wrap(index + 1)));
    viewport.addEventListener('scroll', () => setIndex(Math.round(viewport.scrollLeft / slides[0].offsetWidth)), { passive: true });
    viewport.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(wrap(index + 1)); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(wrap(index - 1)); }
    });
    return;
  }

  // ---- land: each product is a full-width page. A wider copy of its photo,
  // shown only beside the photo, carries the grass to the screen edges.
  slides.forEach((slide) => {
    const photo = slide.querySelector('.slide__photo');
    const land = document.createElement('div');
    land.className = 'slide__land';
    land.setAttribute('aria-hidden', 'true');
    land.style.cssText = photo.getAttribute('style');
    const img = document.createElement('img');
    img.src = photo.querySelector('img').getAttribute('src');
    img.alt = '';
    land.appendChild(img);
    slide.prepend(land);
  });

  // ---- one product at a time: the arrows / keys / drag walk along the land --
  section.classList.add('is-paged');
  const S = () => slides[0].getBoundingClientRect().width;
  const timelines = slides.map(slideTimeline);
  const played = new Set();
  let inView = false;
  const reveal = (i, delay = 0) => {
    if (played.has(i) || !inView) return;
    played.add(i);
    gsap.delayedCall(delay, () => timelines[i].play());
  };

  const place = (i, duration) => {
    const opts = { duration, overwrite: true };
    gsap.to(track, { x: -i * S(), ...opts });
  };
  const go = (i) => {
    i = Math.max(0, Math.min(n - 1, i));
    setIndex(i);
    place(i, 1.6);
    reveal(i, 0.45);
  };
  prevBtn.addEventListener('click', () => go(wrap(index - 1)));
  nextBtn.addEventListener('click', () => go(wrap(index + 1)));
  window.addEventListener('resize', () => place(index, 0));

  const st = ScrollTrigger.create({
    trigger: section,
    start: 'top 55%',
    end: 'bottom 45%',
    onEnter: () => { inView = true; reveal(index); },
    onEnterBack: () => { inView = true; reveal(index); },
  });

  document.addEventListener('keydown', (e) => {
    if (!st.isActive || e.target.closest('input, textarea, [contenteditable]')) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); go(wrap(index + 1)); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(wrap(index - 1)); }
  });

  // drag to travel along the land
  let dragging = false;
  let startX = 0;
  let dx = 0;
  viewport.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || e.target.closest('a, button')) return;
    dragging = true;
    dx = 0;
    startX = e.clientX;
    viewport.setPointerCapture(e.pointerId);
    viewport.classList.add('is-dragging');
  });
  viewport.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    dx = e.clientX - startX;
    // resist at the ends
    const edge = (index === 0 && dx > 0) || (index === n - 1 && dx < 0);
    const off = edge ? dx * 0.25 : dx;
    gsap.set(track, { x: -index * S() + off });
  });
  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    viewport.classList.remove('is-dragging');
    const threshold = Math.min(120, S() * 0.12);
    go(dx < -threshold ? index + 1 : dx > threshold ? index - 1 : index);
  };
  viewport.addEventListener('pointerup', endDrag);
  viewport.addEventListener('pointercancel', endDrag);

  return { st };
}

window.SSG = window.SSG || {};
window.SSG.initProducts = initProducts;
})();
