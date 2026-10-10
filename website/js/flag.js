(function () {
/* ==========================================================================
   National flag: a gentle displacement wave rendered with raw WebGL.
   Only UV sampling is offset, so colours are never altered; the amplitude is
   zero at the pole and grows towards the free end. Low amplitude, slow.

   Smoothness notes:
   - highp in the fragment shader: with mediump (half floats on many GPUs)
     the UVs snap to ~0.5 px steps (jagged pole, "crawling" cloth) and the
     time uniform loses precision after a few minutes (choppy wave).
   - the flag is resampled once to the canvas' exact pixel size, so the
     texture is read ~1:1 and fine detail (chakra spokes, pole edge) can't
     shimmer as the cloth moves (WebGL1 can't mipmap a 1400×2102 texture).
   - the image is decoded off the main thread and only uploaded when the
     section gets close; frames are drawn only while the flag is on screen.
   ========================================================================== */
const VERT = `
attribute vec2 p;
varying vec2 vUv;
void main() { vUv = vec2(p.x * .5 + .5, .5 - p.y * .5); gl_Position = vec4(p, 0., 1.); }`;

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D tex;
uniform float t;
uniform float amp;
varying vec2 vUv;
void main() {
  // pole sits at x≈0.87 in the cut-out; cloth is to its left
  float k = smoothstep(0.84, 0.30, vUv.x) * amp;
  float w1 = sin(vUv.x * 9.0 - t * 1.25 + vUv.y * 2.0);
  float w2 = sin(vUv.x * 4.0 - t * 0.7);
  vec2 off = vec2(0.0024 * w2, 0.0065 * w1 + 0.003 * w2) * k;
  vec4 c = texture2D(tex, vUv + off);
  // keep the pole and finial perfectly rigid
  vec4 rigid = texture2D(tex, vUv);
  gl_FragColor = mix(c, rigid, step(0.845, vUv.x));
}`;

// 1.25·t and 0.7·t both complete whole cycles in 40π s, so wrapping time there is seamless
const PERIOD = 40 * Math.PI;

function initFlag({ section, reduced }) {
  const canvas = section.querySelector('.flag__gl');
  const img = section.querySelector('.flag__img');
  if (!canvas || reduced) return null;
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false });
  if (!gl) return null;

  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const uT = gl.getUniformLocation(prog, 't');
  const uAmp = gl.getUniformLocation(prog, 'amp');

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  // premultiplied texels avoid dark fringes when the edge pixels are filtered
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);

  const state = { amp: 0, ready: false };
  let source = null;      // the decoded full-size flag
  let texW = 0;
  let texH = 0;
  let onScreen = false;
  let near = false;
  let raf = 0;
  let drawnAmp = -1;
  const t0 = performance.now();

  // ---- load: fetch + decode off the main thread ----------------------------
  const decoded = (async () => {
    const src = img.getAttribute('src');
    const url = window.SSG.isFile
      // images read from disk would taint the WebGL texture, so use the embedded copy
      ? `data:image/webp;base64,${await window.SSG.readLocal(src)}`
      : (img.currentSrc || img.src);
    const im = new Image();
    im.decoding = 'async';
    im.src = url;
    await im.decode();
    source = window.createImageBitmap ? await createImageBitmap(im) : im;
  })().catch(() => {});

  // ---- size the drawing buffer to the on-screen pixels, and resample the flag to match
  function fit() {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(r.width * dpr));
    const h = Math.max(1, Math.round(r.height * dpr));
    if (w !== canvas.width || h !== canvas.height) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
    if (source && (w !== texW || h !== texH)) {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const g = c.getContext('2d');
      g.imageSmoothingEnabled = true;
      g.imageSmoothingQuality = 'high';
      g.drawImage(source, 0, 0, w, h);
      try {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
      } catch (e) {
        return false; // texture refused (e.g. cross-origin): keep the static flag image
      }
      c.width = c.height = 0;
      texW = w;
      texH = h;
    }
    return true;
  }

  async function prepare() {
    if (state.ready) return;
    await decoded;
    if (!source || state.ready || gl.isContextLost()) return;
    if (!fit()) return;
    state.ready = true;
    draw(performance.now());
    section.classList.add('has-gl');
    loop();
  }

  function draw(now) {
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(uT, ((now - t0) / 1000) % PERIOD);
    gl.uniform1f(uAmp, state.amp);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    drawnAmp = state.amp;
  }

  // draw on the frame clock while visible; a still flag (amp 0) is drawn once, not every frame
  function frame(now) {
    raf = 0;
    if (!onScreen || !state.ready) return;
    if (state.amp > 0 || drawnAmp !== state.amp) draw(now);
    raf = requestAnimationFrame(frame);
  }
  function loop() { if (!raf && onScreen && state.ready) raf = requestAnimationFrame(frame); }

  // upload once the section is within a couple of screens, render only while the flag is on screen
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !near) { near = true; prepare(); }
  }, { rootMargin: '200% 0px' }).observe(section);
  new IntersectionObserver(([e]) => {
    onScreen = e.isIntersecting;
    loop();
  }, { rootMargin: '60px 0px' }).observe(canvas);

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { if (state.ready && fit()) draw(performance.now()); }, 150);
  });

  // if the GPU drops the context, fall back to the static image
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    state.ready = false;
    section.classList.remove('has-gl');
  });

  return state;
}

window.SSG = window.SSG || {};
window.SSG.initFlag = initFlag;
})();
