/* ==========================================================================
   SSG store intro: the first thing a visitor sees is the SSG store at dusk.
   Scrolling (250vh, pinned) flies the camera over the paving to the entrance,
   the glass doors slide open, the camera passes through, and the warm interior
   light resolves into the hero's gold horizon line, which sweeps away to reveal
   the home page.

   Modes (chosen in main.js):
     '3d'      live scene on the shared #scene renderer (desktop + WebGL)
     'video'   poster, then a pre-rendered fly-in video on scroll / tap (phones, low-power, file://)
     'static'  poster with a gentle fade into the hero (reduced motion, no WebGL)

   The intro is one-way: once entered, its DOM and GPU resources are gone, and a
   sessionStorage flag skips it for the rest of the session.
   ========================================================================== */
(function () {
window.SSG = window.SSG || {};

const STORE_URL = 'assets/00-intro/ssg-store.web.glb';
const STORE_VERSION = 'store-1';
const SEEN_KEY = 'ssg-intro-seen';

const DEG = Math.PI / 180;
const FOV = 35;            // architectural framing for the establishing shot
const FOV_FAST = 47;       // widens as the light takes over, for a sense of speed
const FOV_INSIDE = 40;     // a little wider inside the showroom
const MIN_HFOV = 38;       // narrow windows widen the lens so the store still fits
const PR_SLOW = 1.75;
const PR_FAST = 1.25;      // pixel ratio while the camera is moving fast

// Dusk look (§12): exposure, bloom (threshold high so only emissives bloom) and light levels
const EXPOSURE = 0.95;
const BLOOM = { strength: 0.42, radius: 0.55, threshold: 1.0 };
const DOWNLIGHT = 2.6;       // candela per interior downlight (the GLB's Blender values are ~4900)

/* The visit, in stages of progress p (0..1). Scrolling sets where the camera is heading; it gets
   there no faster than each stage's minimum duration, so even one hard trackpad swipe plays the
   whole visit (~8.5 s). At ENTER_AT the transition into the site commits (one way). */
const STAGES = [
  // [name, from, to, minimum seconds]
  ['approach', 0, 0.40, 2.8],     // across the lawn to the doors, easing down to eye level
  ['doors', 0.40, 0.55, 1.8],     // the glass doors slide apart, the interior brightens
  ['inside', 0.55, 0.85, 2.8],    // walk through the doorway into the showroom
  ['wall', 0.85, 0.95, 1.2],      // settle in front of the SSG feature wall
];
const ENTER_AT = 0.95;     // then the light takes over (0.95 → 1 plays on a clock after the commit)
const pace = (p) => {
  const st = STAGES.find(([, a, b]) => p < b) || STAGES[STAGES.length - 1];
  return (st[2] - st[1]) / st[3];   // progress per second
};
// the warm glow overlay before the commit: a hint of it as the camera settles at the wall
const preGlow = (p) => 0.18 * smooth(range(p, 0.9, ENTER_AT));

// Camera path: wide shot across the lawn -> eye level at the doors -> through the doorway -> the wall
const PATH = [
  [0, 3.0, 23.5], [0.3, 2.55, 16.5], [0.15, 2.0, 12.5], [0, 1.66, 8.8], [0, 1.6, 7.6],
  [0, 1.6, 4.6], [0, 1.62, 1.9], [0, 1.66, 1.1], [0, 1.72, -3.2],
];
const Z_DOOR = 8.8;        // the camera stops here as the doors start to open
const Z_DOOR_HOLD = 7.6;   // and creeps to here while they finish
const Z_INSIDE = 1.9;     // inside the showroom
const Z_WALL = 1.1;       // settled in front of the feature wall (the light push continues to the end)
const LOOK_WIDE = [0, 2.0, 3];
const LOOK_DOOR = [0, 1.65, -5.5];
const LOOK_WALL = [0, 2.05, -5.5];   // the SSG logo on the timber wall

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const lerp = (a, b, t) => a + (b - a) * t;
const range = (p, a, b) => clamp01((p - a) / (b - a));
const smooth = (t) => t * t * (3 - 2 * t);
const inOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const sineInOut = (t) => -(Math.cos(Math.PI * t) - 1) / 2;

function cssColor(name, fallback) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

function seen() {
  try { return sessionStorage.getItem(SEEN_KEY) === '1'; } catch { return false; }
}
function markSeen() {
  try { sessionStorage.setItem(SEEN_KEY, '1'); } catch { /* private mode: the intro just plays again */ }
}
window.SSG.introSeen = seen;

/* ==========================================================================
   The store scene (3D mode only)
   ========================================================================== */
async function createStoreScene({ canvas, onProgress = () => {}, debug = false }) {
  const libs = await window.SSG.loadThree();
  const { THREE, GLTFLoader, DRACOLoader, EffectComposer, RenderPass, UnrealBloomPass, OutputPass } = libs;
  const renderer = window.SSG.createRenderer(THREE, canvas);   // the page's one renderer, shared with the hero
  const isFile = location.protocol === 'file:';

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, window.innerWidth / window.innerHeight, 0.05, 600);
  const C = (n, f) => new THREE.Color(cssColor(n, f));
  const GOLD = C('--gold', '#E9A94A');
  const SUN = C('--sun', '#FFE2A0');
  const NIGHT = C('--night', '#12171E');
  const HAZE = C('--haze', '#4E4A45');
  const EARTH = C('--earth', '#2D2820');

  // ---- Sky: the hero gradient (§12.2) mapped to elevation, with a warm glow towards the set sun
  const SUN_DIR = new THREE.Vector3(0.55, 0, -0.84).normalize();   // behind the store, to the right
  function makeSky(radius) {
    const stops = ['#FFE2A0', '#E9A94A', '#8A6A3A', '#4E4A45', '#2E3742', '#1E2630', '#12171E'].map((c) => new THREE.Color(c));
    return new THREE.Mesh(
      new THREE.SphereGeometry(radius, 48, 24),
      new THREE.ShaderMaterial({
        side: THREE.BackSide, depthWrite: false, fog: false,
        uniforms: { uStops: { value: stops }, uSun: { value: SUN_DIR }, uGround: { value: EARTH.clone().lerp(NIGHT, 0.4) } },
        vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position.z = gl_Position.w; }',
        fragmentShader: `
          uniform vec3 uStops[7]; uniform vec3 uSun; uniform vec3 uGround; varying vec3 vDir;
          vec3 ramp(float e) {
            // elevation stops: a thin gold line at the horizon fading up into slate
            float s[7]; s[0]=0.0; s[1]=0.02; s[2]=0.055; s[3]=0.11; s[4]=0.21; s[5]=0.38; s[6]=0.72;
            vec3 c = uStops[6];
            for (int i = 5; i >= 0; i--) { c = mix(uStops[i], c, smoothstep(s[i], s[i+1], e)); }
            return c;
          }
          void main() {
            vec3 d = normalize(vDir);
            float e = d.y;
            float toward = max(dot(normalize(vec3(d.x, 0.0, d.z)), uSun), 0.0);
            // the glow is stronger (and the gold band taller) towards where the sun has set
            float lift = mix(0.55, 1.35, pow(toward, 3.0));
            vec3 c = ramp(max(e, 0.0) / lift);
            // the sun has just set: a soft warm bloom low in the sky where it went down
            float sunGlow = pow(max(dot(d, normalize(uSun + vec3(0.0, 0.02, 0.0))), 0.0), 48.0);
            c += uStops[0] * sunGlow * 0.55 + uStops[1] * pow(toward, 6.0) * smoothstep(0.25, 0.0, e) * 0.18;
            c = mix(c, uGround, smoothstep(0.0, -0.03, e));
            gl_FragColor = vec4(c, 1.0);
            #include <colorspace_fragment>
          }`,
      })
    );
  }
  const sky = makeSky(400);
  sky.renderOrder = -10;
  scene.add(sky);

  // Environment from the same sky, so the glass and metal reflect the dusk, not a studio
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.add(makeSky(50));
  const envRT = pmrem.fromScene(envScene, 0.02, 0.1, 200);
  envScene.children[0].geometry.dispose();
  envScene.children[0].material.dispose();
  scene.environment = envRT.texture;
  scene.environmentIntensity = 0.55;

  // Far ground: the GLB's lawn ends ~14 m out, so a dark field runs on to the horizon and hazes into it
  scene.fog = new THREE.Fog(HAZE.clone().lerp(NIGHT, 0.35), 30, 170);
  const field = new THREE.Mesh(
    new THREE.CircleGeometry(260, 72),
    new THREE.MeshStandardMaterial({ color: EARTH.clone().lerp(new THREE.Color('#1d2416'), 0.6), roughness: 1, metalness: 0 })
  );
  field.rotation.x = -Math.PI / 2;
  field.position.y = -0.03;
  scene.add(field);

  // Hazy ridges on the horizon, as in the client's reference: two rings of low hills that the
  // fog turns into warm-grey silhouettes against the gold band
  function ridge(radius, base, amp, seedA, fogMix) {
    const N = 220;
    const pos = [];
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2;
      const h = base + amp * (0.55 * Math.sin(a * 3 + seedA) + 0.3 * Math.sin(a * 7.3 + seedA * 2.1) + 0.15 * Math.sin(a * 17.9 + seedA * 0.7) + 0.5);
      const x = Math.sin(a) * radius;
      const z = Math.cos(a) * radius;
      pos.push(x, -2, z, x, Math.max(0.5, h), z);
    }
    const idx = [];
    for (let i = 0; i < N; i++) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: NIGHT.clone().lerp(HAZE, fogMix), side: THREE.DoubleSide, fog: false }));
    mesh.renderOrder = -5;
    return mesh;
  }
  const ridges = new THREE.Group();
  ridges.add(ridge(235, 1.5, 6.5, 1.7, 0.7), ridge(150, -0.6, 3.6, 4.2, 0.3));
  scene.add(ridges);

  // ---- Lights: a low warm gold key from the right, a cool slate fill, the interior downlights
  const key = new THREE.DirectionalLight(GOLD, 1.55);
  key.position.set(14, 3.2, 7);
  scene.add(key, key.target);
  const fill = new THREE.HemisphereLight(new THREE.Color('#8C9AAD'), EARTH, 0.42);
  scene.add(fill);
  // warm spill from the open doorway onto the paving
  const spill = new THREE.PointLight(new THREE.Color('#FFCF8A'), 0, 9, 2);
  spill.position.set(0, 2.4, 3.6);
  scene.add(spill);

  // ---- Post: bloom on the HDR buffer, then tone mapping in the OutputPass
  // MSAA on the HDR buffer is the biggest GPU cost at Retina sizes (2520×1575 on a 1440 screen: 4× drops
  // ~15 % of frames on a Radeon 5300M); there the 1.75× pixel ratio already smooths edges, so it's off.
  // ?msaa=0|2|4 overrides it for QA.
  const msaa = new URLSearchParams(location.search).get('msaa');
  const samples = msaa !== null ? +msaa : Math.min(window.devicePixelRatio || 1, PR_SLOW) >= 1.5 ? 0 : 4;
  const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), BLOOM.strength, BLOOM.radius, BLOOM.threshold);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // ---- State
  const state = { p: 0, glass: 'cheap', adaptive: true, switches: 0 };
  const time = { value: 0 };
  let model = null;
  let doorL = null, doorR = null;
  const downlights = [];
  const mats = {};
  const glassMats = [];
  const transmissionMats = [];
  let ready = false;

  // ---- Load
  const manager = new THREE.LoadingManager();
  let bytes = 0;
  let items = 0;
  const report = () => onProgress(Math.min(0.96, bytes * 0.9 + items * 0.06));
  manager.onProgress = (_url, loaded, total) => { items = total ? loaded / total : 0; report(); };
  const draco = new DRACOLoader(manager).setDecoderPath(window.SSG.DRACO_PATH);
  const loader = new GLTFLoader(manager).setDRACOLoader(draco);

  const loaded = new Promise((resolve, reject) => {
    const done = (gltf) => { try { setup(gltf); resolve(); } catch (e) { reject(e); } };
    if (isFile) reject(new Error('store GLB is not embedded for file://'));
    else {
      loader.load(`${STORE_URL}?v=${STORE_VERSION}`, done, (e) => {
        if (e.lengthComputable) { bytes = e.loaded / e.total; report(); }
      }, reject);
    }
  });

  function setup(gltf) {
    model = gltf.scene;
    scene.add(model);
    const swayKey = () => 'ssg-sway';
    model.traverse((o) => {
      if (o.isLight) {
        // KHR punctual lights arrive at Blender scale: retune so the interior glows without blowing out
        o.color.set('#FFD7A1');
        o.intensity = DOWNLIGHT;
        o.distance = 14;
        o.decay = 2;
        downlights.push(o);
      }
      if (!o.isMesh) return;
      const list = Array.isArray(o.material) ? o.material : [o.material];
      list.forEach((m) => {
        if (!m) return;
        mats[m.name] = m;
        if (m.map) m.map.anisotropy = 4;
        // leaves and foliage blades sway a little (vertex shader, no CPU work)
        if (/^Detailed natural leaf|^M_GrassBlade/.test(m.name) && !m.userData.sway) {
          m.userData.sway = true;
          m.customProgramCacheKey = swayKey;
          m.onBeforeCompile = (sh) => {
            sh.uniforms.uTime = time;
            sh.vertexShader = `uniform float uTime;\n${sh.vertexShader}`.replace('#include <begin_vertex>', `#include <begin_vertex>
              float swH = smoothstep(0.2, 4.5, position.y);
              float sw = sin(uTime * 1.1 + position.x * 0.6 + position.z * 0.45) + 0.45 * sin(uTime * 2.3 + position.y * 1.7 + position.x);
              transformed.x += sw * 0.014 * swH;
              transformed.z += sw * 0.009 * swH;`);
          };
        }
      });
      if (o.name === 'Door_L') doorL = o;
      if (o.name === 'Door_R') doorR = o;
    });
    // the doors may be groups (their meshes are children): find the named nodes themselves
    doorL = model.getObjectByName('Door_L') || doorL;
    doorR = model.getObjectByName('Door_R') || doorR;
    if (!doorL || !doorR) throw new Error('Door_L / Door_R missing from the store GLB');
    doorL.userData.x0 = doorL.position.x;
    doorR.userData.x0 = doorR.position.x;

    // Glass: transmission needs an extra full-scene render each frame; a thin reflective
    // material (dusk sky in the env map, warm interior seen through it) is far cheaper
    model.traverse((o) => {
      if (!o.isMesh || !/^M_Glass/.test(o.material?.name || '')) return;
      transmissionMats.push(o.material);
      const g = new THREE.MeshPhysicalMaterial({
        name: `${o.material.name}_cheap`,
        color: new THREE.Color('#9FB2C4'), metalness: 0, roughness: 0.05,
        transparent: true, opacity: 0.2, depthWrite: false,
        envMapIntensity: 2.2, specularIntensity: 1, ior: 1.5,
      });
      o.userData.glass = { cheap: g, transmission: o.material };
      o.material = g;
      o.renderOrder = 2;
      glassMats.push(o);
    });

    // Emissives at dusk: the sign, logo and lightbox glow; the interior emitters follow the downlights
    const em = (name, color, intensity) => {
      const m = mats[name];
      if (!m) return null;
      if (color) m.emissive = new THREE.Color(color);
      m.emissiveIntensity = intensity;
      m.userData.base = intensity;
      return m;
    };
    em('M_EmitSign', SUN.clone().lerp(new THREE.Color('#ffffff'), 0.2), 2.3);
    const logo = mats.M_Logo;
    if (logo) {
      logo.emissiveMap = logo.map;
      logo.emissive = new THREE.Color('#ffffff');
      logo.emissiveIntensity = 1.15;
      logo.userData.base = 1.15;
      logo.needsUpdate = true;
    }
    em('M_Lightbox', '#FFE9C4', 0.35);
    em('M_EmitCeiling', '#FFE3B8', 0.75);
    em('M_EmitLED', SUN, 5);
    em('M_EmitGlow', '#FFE7BE', 0.42);   // the interior's backlit walls

    // the far field takes the lawn's texture (tiled), so the edge of the modelled lawn doesn't show
    const grass = mats.M_Grass;
    if (grass?.map) {
      const tile = (t) => { const c = t.clone(); c.wrapS = c.wrapT = THREE.RepeatWrapping; c.repeat.set(140, 140); c.needsUpdate = true; return c; };
      field.material.map = tile(grass.map);
      if (grass.normalMap) field.material.normalMap = tile(grass.normalMap);
      field.material.color.copy(grass.color);
      field.geometry.setAttribute('uv', field.geometry.attributes.uv);
      field.material.needsUpdate = true;
    }

    ready = true;
    resize();
    onProgress(0.98);
  }

  // ---- Camera path
  const curve = new THREE.CatmullRomCurve3(PATH.map((v) => new THREE.Vector3(...v)), false, 'centripetal');
  // arc-length positions (u) of the entrance and the hold point, so the timing is in world terms
  const uAtZ = (z) => {
    let best = 0, bestD = Infinity;
    for (let i = 0; i <= 600; i++) {
      const u = i / 600;
      const d = Math.abs(curve.getPointAt(u).z - z);
      if (d < bestD) { bestD = d; best = u; }
    }
    return best;
  };
  const U_DOOR = uAtZ(Z_DOOR);
  const U_HOLD = uAtZ(Z_DOOR_HOLD);
  const U_IN = uAtZ(Z_INSIDE);
  const U_WALL = uAtZ(Z_WALL);
  const lookWide = new THREE.Vector3(...LOOK_WIDE);
  const lookDoor = new THREE.Vector3(...LOOK_DOOR);
  const lookWall = new THREE.Vector3(...LOOK_WALL);

  // each stage eases in and out, so the camera slows into the doors and settles at the wall
  function pathU(p) {
    if (p <= 0.40) return U_DOOR * sineInOut(p / 0.40);
    if (p <= 0.55) return lerp(U_DOOR, U_HOLD, inOut(range(p, 0.40, 0.55)));
    if (p <= 0.85) return lerp(U_HOLD, U_IN, sineInOut(range(p, 0.55, 0.85)));
    if (p <= ENTER_AT) return lerp(U_IN, U_WALL, sineInOut(range(p, 0.85, ENTER_AT)));
    const t = range(p, ENTER_AT, 1);
    return lerp(U_WALL, 1, t * t);                                       // pushed into the light
  }

  const camPos = new THREE.Vector3();
  const look = new THREE.Vector3();
  const lastPos = new THREE.Vector3(0, 0, 999);
  let fovBase = FOV;
  let vw = window.innerWidth, vh = window.innerHeight;
  let pr = Math.min(window.devicePixelRatio || 1, PR_SLOW);
  let fastFor = 0;

  function fovFor(aspect) {
    // keep at least MIN_HFOV horizontally, so the storefront fits portrait / narrow windows
    const need = 2 * Math.atan(Math.tan((MIN_HFOV / 2) * DEG) / aspect) / DEG;
    return Math.max(FOV, need);
  }

  function setRatio(next) {
    if (Math.abs(next - pr) < 0.01) return;
    pr = next;
    state.switches++;
    renderer.setPixelRatio(pr);
    renderer.setSize(vw, vh, false);
    composer.setPixelRatio(pr);
    composer.setSize(vw, vh);
  }

  function resize() {
    vw = window.innerWidth;
    vh = window.innerHeight;
    renderer.setPixelRatio(pr);
    renderer.setSize(vw, vh, false);
    composer.setPixelRatio(pr);
    composer.setSize(vw, vh);
    camera.aspect = vw / vh;
    fovBase = fovFor(camera.aspect);
    camera.updateProjectionMatrix();
  }

  // Pose everything for progress p (0..1) at time t (seconds)
  function pose(p, t, idle = 1) {
    time.value = t;
    const u = pathU(p);
    curve.getPointAt(Math.min(1, u), camPos);
    // a very slow drift of a few cm, fading out once the flight is under way
    const drift = idle * (1 - range(p, 0, 0.08));
    camPos.x += Math.sin(t * 0.21) * 0.06 * drift;
    camPos.y += Math.sin(t * 0.17 + 1.3) * 0.03 * drift;
    camPos.z += Math.cos(t * 0.13) * 0.05 * drift;
    look.copy(lookWide).lerp(lookDoor, sineInOut(range(p, 0.0, 0.42)));
    look.lerp(lookWall, sineInOut(range(p, 0.55, 0.85)));
    // walking in, the eye drifts across the showroom (a glance right, then back to the wall)
    look.x += Math.sin(range(p, 0.58, 0.88) * Math.PI) * 0.9;
    look.x += Math.sin(t * 0.19 + 0.6) * 0.03 * drift;
    camera.position.copy(camPos);
    camera.lookAt(look);
    camera.fov = fovBase + (FOV_INSIDE - FOV) * sineInOut(range(p, 0.55, 0.85)) + (FOV_FAST - FOV_INSIDE) * Math.pow(range(p, ENTER_AT, 1), 1.6);
    camera.updateProjectionMatrix();
    sky.position.copy(camera.position);
    ridges.position.set(camera.position.x, 0, camera.position.z);

    // doors slide apart
    const open = inOut(range(p, 0.40, 0.55));
    if (doorL) {
      doorL.position.x = doorL.userData.x0 - 1.2 * open;
      doorR.position.x = doorR.userData.x0 + 1.2 * open;
    }

    // the interior brightens as the doors open and a touch more inside; light and bloom only swell
    // once the visit is over and the light takes over
    const inside = smooth(range(p, 0.55, 0.85));
    const swell = smooth(range(p, ENTER_AT, 1)) + 0.15 * smooth(range(p, 0.85, ENTER_AT));
    const interior = 0.62 + 0.38 * open + 0.15 * inside + 1.6 * swell;
    downlights.forEach((l) => { l.intensity = DOWNLIGHT * interior; });
    spill.intensity = 2.5 * open + 6 * swell;
    ['M_EmitCeiling', 'M_EmitGlow'].forEach((n) => { if (mats[n]) mats[n].emissiveIntensity = mats[n].userData.base * interior; });
    // a soft pulse on the sign (and logo)
    const pulse = 1 + 0.07 * Math.sin(t * 1.4) + 0.03 * Math.sin(t * 3.1);
    if (mats.M_EmitSign) mats.M_EmitSign.emissiveIntensity = mats.M_EmitSign.userData.base * pulse;
    if (mats.M_Logo) mats.M_Logo.emissiveIntensity = mats.M_Logo.userData.base * (0.5 + 0.5 * pulse);
    bloom.strength = BLOOM.strength + 1.5 * swell;
    bloom.threshold = lerp(BLOOM.threshold, 0.6, swell);
    renderer.toneMappingExposure = EXPOSURE * (1 + 1.1 * swell);
  }

  function render(dt) {
    if (!ready) return;
    composer.render(dt);
  }

  // per-frame: pose, adapt the pixel ratio to camera speed, draw
  let clock = 0;
  function frame(dt) {
    if (!ready || capturing) return;
    clock += dt;
    pose(state.p, clock);
    const speed = lastPos.z > 900 ? 0 : camPos.distanceTo(lastPos) / Math.max(dt, 1 / 240);
    lastPos.copy(camPos);
    if (!state.adaptive) { /* fixed ratio (QA) */ } else if (speed > 2.2) { fastFor = 0.45; setRatio(Math.min(window.devicePixelRatio || 1, PR_FAST)); }
    else if ((fastFor -= dt) <= 0) setRatio(Math.min(window.devicePixelRatio || 1, PR_SLOW));
    render(dt);
  }

  function setGlass(kind) {
    state.glass = kind;
    glassMats.forEach((o) => { o.material = o.userData.glass[kind] || o.userData.glass.cheap; });
  }

  // ---- Dev helpers (?debug): GPU cost of a pose, and offscreen renders for the poster / video
  function bench(n = 60, p = state.p) {
    const gl = renderer.getContext();
    pose(p, clock, 0);
    render(0); gl.finish();
    const t0 = performance.now();
    for (let i = 0; i < n; i++) render(0);
    gl.finish();
    return +((performance.now() - t0) / n).toFixed(2);
  }

  // Offscreen-sized renders for the poster and the fly-in video (tools/render-intro-media.mjs):
  // begin(w, h) pauses the live loop at that size, shot() renders progress p at time t and returns a
  // data URL, with `glow` baking in the DOM glow overlay so a video ends on the same warm screen.
  let capturing = null;
  const capture = {
    begin(w, h) {
      capturing = { vw, vh, pr, c: Object.assign(document.createElement('canvas'), { width: w, height: h }) };
      vw = w; vh = h; pr = 1;
      renderer.setPixelRatio(1);
      renderer.setSize(w, h, false);
      composer.setPixelRatio(1);
      composer.setSize(w, h);
      camera.aspect = w / h;
      fovBase = fovFor(camera.aspect);
    },
    shot({ p, t = 0, glow = 0, type = 'image/png', quality }) {
      pose(p, t, 1);
      render(0);
      const { c } = capturing;
      const g = c.getContext('2d');
      g.drawImage(renderer.domElement, 0, 0, c.width, c.height);
      if (glow > 0) paintGlow(g, c.width, c.height, glow);
      return c.toDataURL(type, quality);
    },
    end() {
      ({ vw, vh, pr } = capturing);
      capturing = null;
      resize();
    },
  };

  function dispose() {
    ready = false;
    const textures = new Set();
    scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      const list = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
      list.forEach((m) => {
        Object.values(m).forEach((v) => { if (v && v.isTexture) textures.add(v); });
        m.dispose();
      });
      if (o.userData.glass) Object.values(o.userData.glass).forEach((m) => m.dispose());
    });
    transmissionMats.forEach((m) => m.dispose());
    textures.forEach((t) => t.dispose());
    envRT.dispose();
    pmrem.dispose();
    composer.renderTarget1.dispose();
    composer.renderTarget2.dispose();
    bloom.dispose();
    draco.dispose();
    scene.clear();
    renderer.renderLists.dispose();
    renderer.toneMappingExposure = 1.05;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.SSG.PIXEL_RATIO));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
  }

  resize();
  return {
    state, loaded, frame, resize, dispose, setGlass, bench, capture, pose, render,
    get ready() { return ready; },
    info: () => ({ calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, textures: renderer.info.memory.textures, geometries: renderer.info.memory.geometries }),
    camera, scene, debug,
    // live tuning handles (?debug)
    tune: { mats, downlights, key, fill, spill, bloom, field, sky, curve, ridges },
  };
}

// The warm screen the flight ends on (same look as .intro-glow in CSS)
function paintGlow(g, w, h, a) {
  const r = Math.hypot(w, h) * 0.62;
  const grd = g.createRadialGradient(w / 2, h * 0.52, 0, w / 2, h * 0.52, r);
  grd.addColorStop(0, `rgba(255,236,196,${a})`);
  grd.addColorStop(0.35, `rgba(255,226,160,${a})`);
  grd.addColorStop(0.75, `rgba(233,169,74,${a})`);
  grd.addColorStop(1, `rgba(185,119,46,${a})`);
  g.fillStyle = grd;
  g.fillRect(0, 0, w, h);
}

/* ==========================================================================
   The intro controller: DOM, scroll, skip, transition (all modes)
   ========================================================================== */
function createIntro({ mode, gsap, lenis, canvas, onProgress = () => {}, debug = false }) {
  const root = document.documentElement;
  const el = document.getElementById('intro');
  const stage = el.querySelector('.intro__stage');
  const label = el.querySelector('.intro__label');
  const hint = el.querySelector('.intro__hint');
  const skipBtn = el.querySelector('.intro__skip');
  const poster = el.querySelector('.intro__poster');
  const video = el.querySelector('.intro__video');
  const glow = document.getElementById('intro-glow');
  const line = glow.querySelector('.intro-glow__line');
  root.classList.add(`intro-${mode}`);

  let store = null;
  let tick = null;
  let scrub = null;
  let follow = null;
  let committed = false;
  let resolveEntered;
  const entered = new Promise((r) => { resolveEntered = r; });

  const portrait = () => window.innerHeight > window.innerWidth * 1.1;

  // ---- Load: the store GLB (3D) or the poster image (video / static)
  let loaded;
  if (mode === '3d') {
    loaded = createStoreScene({ canvas, onProgress, debug }).then((s) => { store = s; return s.loaded; });
  } else {
    poster.src = poster.dataset[portrait() ? 'portrait' : 'landscape'];
    loaded = new Promise((resolve) => {
      if (poster.complete && poster.naturalWidth) resolve();
      else { poster.onload = resolve; poster.onerror = resolve; }
    }).then(() => onProgress(0.96));
  }

  // ---- Start: called once the preloader has opened onto the intro
  function start() {
    if (mode === '3d') {
      // scroll (400vh, pinned) sets where the camera is heading; the camera follows at the visit's
      // pace, so a fast swipe still walks the whole route instead of jumping to the site
      const target = { p: 0 };
      scrub = gsap.to(target, {
        p: 1, ease: 'none',
        scrollTrigger: {
          trigger: el, start: 'top top', end: () => `+=${window.innerHeight * 4}`, scrub: 0.4, pin: stage, anticipatePin: 1,
        },
      });
      follow = { target, paused: false };
      let shownLabels = -1, shownGlow = -1;
      tick = (_t, ms) => {
        const dt = Math.min(ms, 50) / 1000;
        const st = store.state;
        if (!committed && !follow.paused) {
          const rate = pace(st.p);
          // ease towards the scroll position, never faster than the stage allows (a little faster back)
          const step = (target.p - st.p) * Math.min(1, dt * 3.2);
          st.p = Math.min(ENTER_AT, st.p + Math.max(-1.5 * rate * dt, Math.min(rate * dt, step)));
          if (st.p >= ENTER_AT - 0.002) commit();
        }
        const labels = 1 - smooth(range(st.p, 0, 0.04));
        if (labels !== shownLabels) { label.style.opacity = hint.style.opacity = labels; shownLabels = labels; }
        if (!committed) {
          const g = preGlow(st.p);
          if (g !== shownGlow) { glow.style.opacity = g; shownGlow = g; }
        }
        store.frame(dt);
      };
      gsap.ticker.add(tick);
    } else {
      // video / static: the page doesn't scroll yet; the first scroll, swipe, key or tap enters
      const go = (e) => {
        if (e.type === 'keydown' && !['ArrowDown', 'PageDown', ' ', 'Enter', 'Spacebar'].includes(e.key)) return;
        if (e.type === 'wheel' && e.deltaY <= 0) return;
        if (e.target.closest?.('.intro__skip')) return;
        off();
        if (mode === 'video') playVideo();
        else commit();
      };
      const evs = ['wheel', 'touchmove', 'pointerup', 'keydown'];
      const off = () => evs.forEach((n) => window.removeEventListener(n, go));
      evs.forEach((n) => window.addEventListener(n, go, { passive: true }));
      if (mode === 'video') {
        video.src = video.dataset[portrait() ? 'portrait' : 'landscape'];
        video.preload = 'auto';
        video.load();
      }
    }
    window.addEventListener('keydown', onKey);
    skipBtn.addEventListener('click', onSkip);
  }

  function onKey(e) { if (e.key === 'Escape') commit(true); }
  function onSkip() { commit(true); }

  function playVideo() {
    gsap.to([label, hint], { opacity: 0, duration: 0.4 });
    gsap.to(poster, { opacity: 0, duration: 0.3, delay: 0.15 });
    video.addEventListener('ended', () => commit(), { once: true });
    video.addEventListener('error', () => commit(), { once: true });
    const p = video.play();
    if (p && p.catch) p.catch(() => commit());
  }

  // ---- Commit: one way into the site. Resolves `entered` once the screen is covered.
  function commit(skipped = false) {
    if (committed) return;
    committed = true;
    markSeen();
    window.removeEventListener('keydown', onKey);
    skipBtn.removeEventListener('click', onSkip);
    lenis?.stop();
    const tl = gsap.timeline({ onComplete: () => resolveEntered() });
    tl.to([label, hint, skipBtn], { opacity: 0, duration: 0.3, ease: 'power1.out', overwrite: true }, 0);
    if (mode === 'static') {
      // reduced motion: no flight, no glow; the poster simply fades once the hero is underneath
      tl.to({}, { duration: 0.01 });
      return;
    }
    if (mode === '3d') {
      if (scrub) {
        const st = scrub.scrollTrigger;
        scrub.kill();
        st?.kill(false);
      }
      // keep flying forward into the light (faster when skipped from the establishing shot)
      tl.to(store.state, { p: 1, duration: skipped ? 1.1 : 1.2, ease: skipped ? 'power2.inOut' : 'power1.in' }, 0);
      tl.to(glow, { opacity: 1, duration: skipped ? 0.9 : 1.0, ease: 'power2.in' }, skipped ? 0.2 : 0.2);
    } else {
      tl.to(glow, { opacity: 1, duration: skipped ? 0.5 : 0.35, ease: 'power1.in' }, 0);
    }
  }

  // ---- Teardown: called by main.js while the glow covers the screen (or, for static, before the fade)
  function teardown() {
    if (tick) gsap.ticker.remove(tick);
    tick = null;
    if (store) {
      store.dispose();
      store = null;
    }
    if (mode === 'video') { video.pause(); video.removeAttribute('src'); video.load(); }
    // static keeps its poster up (fixed, over the hero) until reveal() has faded it
    if (mode === 'static') root.classList.add('intro-fading');
    else el.remove();
    root.classList.remove('intro-active', `intro-${mode}`);
  }

  // ---- Reveal: the glow resolves into the hero's gold horizon line, which then sweeps away.
  // `horizonY` is the line's viewport y; `onLine` fires as the glow starts to collapse onto it.
  function reveal({ horizonY, onLine = () => {} }) {
    return new Promise((resolve) => {
      const done = () => {
        glow.remove();
        if (el.isConnected) el.remove();
        root.classList.remove('intro-fading');
        resolve();
      };
      if (mode === 'static') {
        gsap.timeline({ onComplete: done })
          .add(onLine, 0)
          .to(el, { opacity: 0, duration: 0.8, ease: 'power1.inOut' }, 0);
        return;
      }
      const vh = window.innerHeight;
      const y = Math.round(Math.min(Math.max(horizonY, vh * 0.3), vh * 0.92));
      gsap.set(line, { top: y, opacity: 0, scaleX: 1 });
      // inset(top right bottom left): collapse the glow onto a 2px band at y
      gsap.timeline({ onComplete: done })
        .add(onLine, 0.15)
        .fromTo(glow, { clipPath: 'inset(0px 0px 0px 0px)' }, { clipPath: `inset(${y}px 0px ${vh - y - 2}px 0px)`, duration: 1.15, ease: 'ssg' }, 0)
        .to(line, { opacity: 1, duration: 0.5, ease: 'power1.out' }, 0.45)
        .set(glow, { background: 'transparent' }, 1.15)
        // the line sweeps off to the right, leaving the hero's own horizon behind it
        .to(line, { scaleX: 0, transformOrigin: '100% 50%', duration: 1.1, ease: 'ssg' }, 1.2)
        .to(line, { opacity: 0, duration: 0.5, ease: 'power1.in' }, 1.75);
    });
  }

  // ---- Bail out (load failure / timeout): remove everything, the page boots normally
  function abort() {
    committed = true;
    if (scrub) { scrub.scrollTrigger?.kill(false); scrub.kill(); }
    window.removeEventListener('keydown', onKey);
    teardown();
    glow.remove();
    el.remove();
  }

  const api = { mode, loaded, entered, start, commit, teardown, reveal, abort, get store() { return store; } };
  if (debug) {
    // QA helpers: pose the live scene, measure the GPU cost, compare glass materials
    // pose the visit at p and hold it there (QA screenshots); setProgress(null) hands control back to the scroll
    api.setProgress = (p) => {
      if (!store || !follow) return;
      follow.paused = p !== null;
      if (p !== null) { store.state.p = p; glow.style.opacity = preGlow(p); }
    };
  }
  return api;
}

window.SSG.createIntro = createIntro;
// shared with tools/render-intro-media.mjs, so the fallback video keeps the live visit's pacing
window.SSG.introPacing = { STAGES, ENTER_AT, pace, preGlow };
window.SSG.paintIntroGlow = paintGlow;
})();
