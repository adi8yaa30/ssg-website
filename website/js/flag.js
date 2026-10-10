(function () {
/* ==========================================================================
   National flag: a gentle displacement wave rendered with raw WebGL.
   Only UV sampling is offset, so colours are never altered; the amplitude is
   zero at the pole and grows towards the free end. Low amplitude, slow.
   ========================================================================== */
const VERT = `
attribute vec2 p;
varying vec2 vUv;
void main() { vUv = vec2(p.x * .5 + .5, .5 - p.y * .5); gl_Position = vec4(p, 0., 1.); }`;

const FRAG = `
precision mediump float;
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

function initFlag({ section, reduced }) {
  const canvas = section.querySelector('.flag__gl');
  const img = section.querySelector('.flag__img');
  if (!canvas || reduced) return null;
  // This is a single full-canvas quad, so multisampling only burns fill-rate.
  // Keep the transparent context cheap: the source image already carries all
  // of the edge detail we need.
  const gl = canvas.getContext('webgl', {
    premultipliedAlpha: true,
    alpha: true,
    antialias: false,
    powerPreference: 'low-power',
  });
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

  const state = { amp: 0, running: false, ready: false };
  let raf = 0;
  let lastFrame = 0;
  let t0 = performance.now();

  const source = new Image();
  source.decoding = 'async';
  source.onload = () => {
    try {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    } catch (e) {
      return; // texture refused (e.g. cross-origin): keep the static flag image
    }
    state.ready = true;
    resize();
    section.classList.add('has-gl');
    draw();
  };
  const src = img.getAttribute('src');
  if (window.SSG.isFile) {
    // images read from disk would taint the WebGL texture, so use the embedded copy
    window.SSG.readLocal(src).then((b64) => { source.src = `data:image/webp;base64,${b64}`; }).catch(() => {});
  } else {
    source.src = img.currentSrc || img.src;
  }

  function resize() {
    const r = canvas.getBoundingClientRect();
    // The flag is a soft photographic asset. Rendering it at retina 2x makes
    // the fragment shader process ~7.5m pixels per frame on a 1440p display
    // without a visible improvement.
    const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
    canvas.width = Math.max(1, Math.round(r.width * dpr));
    canvas.height = Math.max(1, Math.round(r.height * dpr));
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  function draw() {
    if (!state.ready) return;
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(uT, (performance.now() - t0) / 1000);
    gl.uniform1f(uAmp, state.amp);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  function loop(now) {
    // A gentle fabric wave looks identical at 30fps and halves GPU work.
    if (now - lastFrame >= 32) {
      draw();
      lastFrame = now;
    }
    raf = state.running ? requestAnimationFrame(loop) : 0;
  }

  const setRunning = (running) => {
    state.running = running && !document.hidden;
    if (state.running && !raf) raf = requestAnimationFrame(loop);
    if (!state.running && raf) { cancelAnimationFrame(raf); raf = 0; }
  };
  let inView = false;
  const io = new IntersectionObserver(([e]) => {
    inView = e.isIntersecting;
    setRunning(inView);
  }, { rootMargin: '0px' });
  io.observe(section);
  document.addEventListener('visibilitychange', () => setRunning(inView));
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { if (state.ready) { resize(); draw(); } }, 120);
  }, { passive: true });

  return state;
}

window.SSG = window.SSG || {};
window.SSG.initFlag = initFlag;
})();
