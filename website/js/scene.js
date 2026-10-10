/* ==========================================================================
   SSG hero 3D: one fixed transparent canvas, a GLB street light anchored to
   #anchor-streetlight and a detachable `panelRig` that flies to
   #anchor-panel-why and later returns from behind the flag to
   #anchor-panel-sun. Every pose is recomputed per frame from DOM anchors, so
   the 3D always scrolls with (and stays aligned to) the layout.
   ========================================================================== */
(function () {
window.SSG = window.SSG || {};

/* Local-file support: when the page is opened straight from disk (file://),
   browsers block fetch() of local files. Heavy assets then come from small
   companion scripts (<file>.js) that register their content here. */
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
function base64ToBuffer(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}
window.SSG.isFile = isFile;
window.SSG.loadScript = loadScript;
window.SSG.readLocal = readLocal;

const MODEL_URL = 'assets/01-hero/model/ssg-streetlight.web.glb';
const DRACO_PATH = 'https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/libs/draco/gltf/';

const DEG = Math.PI / 180;
const FOV = 20;
const CAM_Z = 40;

// Look of the street light in the hero (matches the Figma 3/4 view)
const LIGHT_YAW = 28 * DEG;      // lamp head towards the right-front, panel face visible
const LIGHT_TILT = 22 * DEG;     // camera looks down onto the panel and the island
// Resting rolls of the flying panel, as in the design
const WHY_ROLL = -5 * DEG;
const SUN_ROLL = 12.8 * DEG;

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
const inOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const backOut = (t, s = 1.4) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);

// three.js is loaded on demand (via the import map), so phones and no-WebGL visitors never download it
async function createScene(opts) {
  const [THREE, { GLTFLoader }, { DRACOLoader }, { RoomEnvironment }] = await Promise.all([
    import('three'),
    import('three/addons/loaders/GLTFLoader.js'),
    import('three/addons/loaders/DRACOLoader.js'),
    import('three/addons/environments/RoomEnvironment.js'),
  ]);
  return buildScene({ THREE, GLTFLoader, DRACOLoader, RoomEnvironment }, opts);
}
window.SSG.createScene = createScene;

function buildScene({ THREE, GLTFLoader, DRACOLoader, RoomEnvironment }, { canvas, anchors, reducedMotion = false, onProgress = () => {}, onHeroPoints = () => {} }) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 400);
  camera.position.set(0, 0, CAM_Z);

  // Environment for metal / glass reflections
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = envRT.texture;
  scene.environmentIntensity = 0.85;
  scene.environmentRotation = new THREE.Euler(0, 0, 0);

  // Soft key from top-left + subtle cool rim
  const key = new THREE.DirectionalLight(0xffffff, 2.1);
  key.position.set(-6, 9, 8);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xc9d4ff, 1.3);
  rim.position.set(7, 4, -7);
  scene.add(rim);
  const fill = new THREE.HemisphereLight(0xffffff, 0x7f8ee8, 0.55);
  scene.add(fill);
  // Moving specular highlight across the cells while the panel travels
  const sweep = new THREE.PointLight(0xffffff, 0, 0, 2);
  scene.add(sweep);
  const glintLight = new THREE.PointLight(0xfff4d6, 0, 0, 2);
  scene.add(glintLight);

  // Rig hierarchy: lightPivot (anchor + scale + sway) > lightTilt > model
  const lightPivot = new THREE.Group();
  const lightTilt = new THREE.Group();
  lightPivot.add(lightTilt);
  scene.add(lightPivot);

  const api = {
    state: {
      intro: reducedMotion ? 1 : 0,   // 0..1 load-in
      detach: 0,                      // 0..1 state B
      sun: 0,                         // 0..1 state E
      sunMode: false,
      ledGlow: 0.6,
      pointerX: 0,
      pointerY: 0,
    },
    ready: false,
    renderer,
    glint,
    capturePanel,
    dispose,
  };

  let model, panelRig, ledMat, contact;
  const rigRest = new THREE.Matrix4();
  const modelSize = new THREE.Vector3();
  const modelCenter = new THREE.Vector3();
  let panelWidth = 2;
  const polePoint = new THREE.Vector3();
  const ledPoint = new THREE.Vector3();

  // ---- Load ---------------------------------------------------------------
  const manager = new THREE.LoadingManager();
  manager.onProgress = (_url, loaded, total) => onProgress(total ? loaded / total : 0);

  const draco = new DRACOLoader(manager).setDecoderPath(DRACO_PATH);
  const loader = new GLTFLoader(manager).setDRACOLoader(draco);

  const loaded = new Promise((resolve, reject) => {
    const done = (gltf) => { setup(gltf); resolve(api); };
    if (isFile) {
      // opened from disk: read the embedded copy of the GLB
      onProgress(0.3);
      readLocal(MODEL_URL)
        .then((b64) => { onProgress(0.8); loader.parse(base64ToBuffer(b64), '', done, reject); })
        .catch(reject);
    } else {
      loader.load(
        `${MODEL_URL}?v=landscape-4`,
        done,
        (e) => { if (e.lengthComputable) onProgress(Math.min(0.98, e.loaded / e.total)); },
        reject
      );
    }
  });

  function find(re) {
    let hit = null;
    model.traverse((o) => { if (!hit && re.test(o.name)) hit = o; });
    return hit;
  }

  function setup(gltf) {
    model = gltf.scene;
    lightTilt.add(model);

    model.traverse((o) => {
      if (o.isMesh) {
        o.frustumCulled = false;
        const m = o.material;
        if (m && m.name === 'M_LED') ledMat = m;
        if (m && m.map) m.map.anisotropy = 4;
      }
    });
    if (ledMat) {
      ledMat.emissive = new THREE.Color(0xfff2d0);
      ledMat.emissiveIntensity = api.state.ledGlow;
    }

    // Model bounds at rest (all parents are identity here, so world == model space)
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    box.getSize(modelSize);
    box.getCenter(modelCenter);

    // Callout targets (model space): pole at the arm junction, LED head front edge
    const pole = find(/^Pole$/);
    const led = find(/^LED$/) || find(/^Lamp$/);
    const poleBox = new THREE.Box3().setFromObject(pole);
    const ledBox = new THREE.Box3().setFromObject(led);
    polePoint.set(poleBox.min.x, poleBox.min.y + (poleBox.max.y - poleBox.min.y) * 0.72, (poleBox.min.z + poleBox.max.z) / 2);
    ledPoint.set(ledBox.max.x, (ledBox.min.y + ledBox.max.y) / 2, (ledBox.min.z + ledBox.max.z) / 2);

    // ---- panelRig: Panel + its 4 corner fixings (separate top-level nodes)
    const panel = find(/^Panel$/);
    const fixings = [];
    model.traverse((o) => { if (/^Panel_?frame_?corner_?fixing/i.test(o.name)) fixings.push(o); });
    const pBox = new THREE.Box3().setFromObject(panel);
    panelWidth = pBox.max.x - pBox.min.x;
    panelRig = new THREE.Group();
    panelRig.name = 'panelRig';
    panelRig.position.copy(panel.position); // Panel's origin is its centre
    model.add(panelRig);
    model.updateMatrixWorld(true);
    panelRig.attach(panel);
    fixings.forEach((f) => panelRig.attach(f));
    rigRest.copy(panelRig.matrix); // pose relative to the model

    // Pivot the light around its bounding-box centre
    model.position.copy(modelCenter).multiplyScalar(-1);
    model.updateMatrixWorld(true);

    // Move the rig into world space; its pose is computed every frame
    scene.attach(panelRig);

    // Soft contact shadow under the grass island
    contact = makeContactShadow();
    contact.position.set(0, box.min.y - modelCenter.y + 0.02, 0);
    lightTilt.add(contact);

    api.ready = true;
    resize();
    renderer.compile(scene, camera);
  }

  function makeContactShadow() {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(10,20,70,0.55)');
    grd.addColorStop(0.55, 'rgba(10,20,70,0.18)');
    grd.addColorStop(1, 'rgba(10,20,70,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(c);
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(modelSize.x * 1.9, modelSize.z * 1.9),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.renderOrder = -1;
    return mesh;
  }

  // ---- Screen <-> world ---------------------------------------------------
  let vw = window.innerWidth;
  let vh = window.innerHeight;
  let visH = 1;
  let visW = 1;
  let worldPerPx = 1;

  function resize() {
    vw = window.innerWidth;
    vh = window.innerHeight;
    renderer.setSize(vw, vh, false);
    camera.aspect = vw / vh;
    camera.updateProjectionMatrix();
    visH = 2 * CAM_Z * Math.tan((FOV / 2) * DEG);
    visW = visH * camera.aspect;
    worldPerPx = visH / vh;
    needsRender = true;
  }

  const toWorld = (px, py, out) => out.set((px / vw - 0.5) * visW, (0.5 - py / vh) * visH, 0);
  const tmpV = new THREE.Vector3();
  function project(v) {
    tmpV.copy(v).project(camera);
    return { x: (tmpV.x + 1) * 0.5 * vw, y: (1 - tmpV.y) * 0.5 * vh };
  }

  // ---- Per-frame pose ---------------------------------------------------
  const pA = new THREE.Vector3(), qA = new THREE.Quaternion(), sA = new THREE.Vector3();
  const pW = new THREE.Vector3(), qW = new THREE.Quaternion();
  const pS = new THREE.Vector3(), qS = new THREE.Quaternion();
  const pT = new THREE.Vector3(), qT = new THREE.Quaternion();
  const mTmp = new THREE.Matrix4();
  const eTmp = new THREE.Euler();
  const qTmp = new THREE.Quaternion();
  const up = new THREE.Vector3();
  const faceQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(75 * DEG, 0, 0)); // cancels the 15° mount tilt

  let yaw = reducedMotion ? 0 : -12 * DEG;
  let swayYaw = 0;
  let swayPitch = 0;
  let needsRender = true;
  let lastVisible = true;
  let time = 0;

  function rectOf(el) { return el.getBoundingClientRect(); }
  const onScreen = (r, pad = 0) => r.bottom > -pad && r.top < vh + pad && r.right > -pad && r.left < vw + pad;

  // Whether any anchor is within a screen of the viewport. Once the hero, Why SSG and
  // the sun section are all far away, frames skip every DOM read and draw nothing.
  let anchorsNear = true;
  if ('IntersectionObserver' in window) {
    const near = new Set();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => (e.isIntersecting ? near.add(e.target) : near.delete(e.target)));
      anchorsNear = near.size > 0;
    }, { rootMargin: '100% 0px' });
    Object.values(anchors).forEach((a) => a && io.observe(a));
  }

  function frame(dt) {
    if (!api.ready) return;
    time += dt;
    // nothing near and the canvas already cleared: nothing to do
    if (!anchorsNear && !lastVisible && !needsRender) return;
    const s = api.state;

    // --- street light at #anchor-streetlight
    const rL = rectOf(anchors.streetlight);
    const lightVisible = onScreen(rL, 40);
    const scale = (rL.height * worldPerPx) / modelSize.y;
    toWorld(rL.left + rL.width / 2, rL.top + rL.height / 2 + (1 - s.intro) * 40, lightPivot.position);
    lightPivot.scale.setScalar(scale);

    if (!reducedMotion) {
      const introYaw = lerp(-12 * DEG, 0, s.intro);
      swayYaw += (s.pointerX * 3 * DEG - swayYaw) * Math.min(1, dt * 2.5);
      swayPitch += (s.pointerY * 1.2 * DEG - swayPitch) * Math.min(1, dt * 2.5);
      yaw = introYaw + swayYaw;
    }
    lightTilt.rotation.set((s.baseTilt ?? LIGHT_TILT) + swayPitch, (s.baseYaw ?? LIGHT_YAW) + yaw, 0);
    lightPivot.updateMatrixWorld(true);
    if (ledMat) ledMat.emissiveIntensity = s.ledGlow;

    // --- panel: attached pose
    mTmp.multiplyMatrices(model.matrixWorld, rigRest);
    mTmp.decompose(pA, qA, sA);
    up.set(0, 1, 0).applyQuaternion(lightTilt.getWorldQuaternion(qTmp));

    // --- why pose
    const rW = rectOf(anchors.why);
    toWorld(rW.left + rW.width / 2, rW.top + rW.height / 2, pW);
    const scaleW = (rW.width * worldPerPx) / panelWidth;
    qW.setFromEuler(eTmp.set(0, 0, WHY_ROLL)).multiply(faceQ);

    let visible = lightVisible;
    let sweepK = 0;

    if (s.sunMode) {
      // --- state E: returns from behind the flag
      const rS = rectOf(anchors.sun);
      const t = backOut(clamp01(s.sun), 0.9);
      const offsetPx = lerp(-0.6 * vh, 0, Math.min(1, t));
      toWorld(rS.left + rS.width / 2, rS.top + rS.height / 2 + offsetPx, pS);
      const roll = lerp(-25 * DEG, SUN_ROLL, clamp01(s.sun));
      qS.setFromEuler(eTmp.set(0, 0, roll)).multiply(faceQ);
      const scaleS = (rS.width * worldPerPx) / panelWidth;
      panelRig.position.copy(pS);
      panelRig.quaternion.copy(qS);
      panelRig.scale.setScalar(scaleS);
      const panelRect = { top: rS.top + offsetPx - rS.height, bottom: rS.bottom + offsetPx + rS.height, left: rS.left, right: rS.right };
      panelRig.visible = onScreen(panelRect);
      sweepK = Math.sin(clamp01(s.sun) * Math.PI) * 0.8;
    } else {
      const p = reducedMotion ? 0 : clamp01(s.detach);
      // lift + wobble (0–15%)
      const lift = smooth(clamp01(p / 0.15));
      const wobble = Math.sin(clamp01(p / 0.15) * Math.PI * 2) * 2 * DEG * (1 - clamp01((p - 0.1) / 0.1));
      pT.copy(pA).addScaledVector(up, 0.25 * sA.x * lift);
      qT.copy(qA).multiply(qTmp.setFromEuler(eTmp.set(0, 0, wobble)));
      let sc = sA.x;

      if (p > 0.15) {
        // travel (15–70%) to a hover point just above the anchor, then land (70–100%)
        const pre = pW.clone().add(new THREE.Vector3(0, rW.height * worldPerPx * 0.35, 1.2));
        const qPre = qW.clone().multiply(qTmp.setFromEuler(eTmp.set(0, 0, -4 * DEG)));
        const t = inOut(clamp01((p - 0.15) / 0.55));
        const fromP = pT.clone();
        pT.lerpVectors(fromP, pre, t);
        // a little arc: swing out to the right and towards the camera mid-flight
        pT.x += Math.sin(t * Math.PI) * visW * 0.06;
        pT.z += Math.sin(t * Math.PI) * 3;
        qT.slerp(qPre, t);
        sc = lerp(sA.x, scaleW * 1.06, t);
        sweepK = Math.sin(t * Math.PI);
        if (p > 0.7) {
          const k = backOut(clamp01((p - 0.7) / 0.3), 1.3);
          pT.lerpVectors(pre, pW, k);
          qT.copy(qPre).slerp(qW, Math.min(1, k));
          sc = lerp(scaleW * 1.06, scaleW, Math.min(1, k));
        }
      }
      panelRig.position.copy(pT);
      panelRig.quaternion.copy(qT);
      panelRig.scale.setScalar(sc);

      const whyVisible = onScreen(rW, rW.height);
      panelRig.visible = p < 0.15 ? lightVisible : (whyVisible || lightVisible);
    }
    visible = visible || panelRig.visible;

    // specular sweep light + env rotation for a moving glint across the cells
    if (panelRig.visible) {
      const span = panelWidth * panelRig.scale.x;
      sweep.position.copy(panelRig.position).add(new THREE.Vector3(lerp(-0.9, 0.9, (time * 0.15) % 1) * span, span * 0.3, span * 0.7));
      sweep.intensity = sweepK * 14 * panelRig.scale.x * panelRig.scale.x;
      sweep.distance = span * 2.5;
      scene.environmentRotation.y = sweepK * 0.5;
    } else {
      sweep.intensity = 0;
    }
    glintLight.position.copy(panelRig.position).add(glintOffset.clone().multiplyScalar(panelWidth * panelRig.scale.x));
    glintLight.distance = panelWidth * panelRig.scale.x * 1.6;

    // hero callout anchor points (projected)
    if (lightVisible) {
      onHeroPoints({
        pole: project(tmp3.copy(polePoint).applyMatrix4(model.matrixWorld)),
        led: project(tmp3.copy(ledPoint).applyMatrix4(model.matrixWorld)),
      });
    }

    model.visible = lightVisible;
    if (visible) {
      renderer.render(scene, camera);
      lastVisible = true;
    } else if (lastVisible || needsRender) {
      renderer.clear();
      lastVisible = false;
    }
    needsRender = false;
  }
  const tmp3 = new THREE.Vector3();
  const glintOffset = new THREE.Vector3();

  // A short highlight on the cell row nearest a hovered Why-SSG card
  function glint(index) {
    const sx = index % 2 === 0 ? -0.35 : 0.35;
    const sy = index < 2 ? 0.2 : -0.2;
    glintOffset.set(sx, sy, 0.35);
    if (window.gsap) {
      window.gsap.fromTo(glintLight, { intensity: 0 }, { intensity: 40 * panelRig.scale.x * panelRig.scale.x, duration: 0.35, ease: 'power2.out', yoyo: true, repeat: 1 });
    }
  }

  // Dev helper: render the panel face-on to a transparent PNG/WebP blob (used to make the static mobile panel)
  async function capturePanel(w = 1200, h = 600) {
    const rt = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
    rt.setSize(w, h, false);
    rt.setPixelRatio(1);
    rt.outputColorSpace = THREE.SRGBColorSpace;
    rt.toneMapping = THREE.ACESFilmicToneMapping;
    rt.setClearColor(0, 0);
    const cam = new THREE.PerspectiveCamera(FOV, w / h, 0.1, 400);
    cam.position.set(0, 0, CAM_Z);
    const saved = { p: panelRig.position.clone(), q: panelRig.quaternion.clone(), s: panelRig.scale.clone(), mv: model.visible, v: panelRig.visible, env: scene.environment };
    const vH = 2 * CAM_Z * Math.tan((FOV / 2) * DEG);
    const vW = vH * (w / h);
    panelRig.position.set(0, 0, 0);
    panelRig.quaternion.copy(faceQ);
    panelRig.scale.setScalar(1);
    panelRig.updateMatrixWorld(true);
    const size = new THREE.Box3().setFromObject(panelRig).getSize(new THREE.Vector3());
    panelRig.scale.setScalar(Math.min((vW * 0.97) / size.x, (vH * 0.97) / size.y));
    panelRig.visible = true;
    model.visible = false;
    contact.visible = false;
    const pm = new THREE.PMREMGenerator(rt);
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    rt.render(scene, cam);
    const blob = await new Promise((r) => rt.domElement.toBlob(r, 'image/webp', 0.9));
    Object.assign(panelRig.position, saved.p);
    panelRig.quaternion.copy(saved.q);
    panelRig.scale.copy(saved.s);
    model.visible = saved.mv;
    panelRig.visible = saved.v;
    contact.visible = true;
    scene.environment = saved.env;
    rt.dispose();
    return blob;
  }

  function dispose() {
    renderer.dispose();
    pmrem.dispose();
  }

  window.addEventListener('resize', resize);
  resize();

  return { api, loaded, frame, resize };
}
})();
