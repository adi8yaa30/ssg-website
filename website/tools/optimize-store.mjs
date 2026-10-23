/* Builds the web version of the store intro model.

     assets/00-intro/ssg-store-hq.glb  (30 MB, ~986k triangles)
       -> assets/00-intro/ssg-store.web.glb

   The vegetation is made of single triangles (leaves, foliage blades) and two-triangle
   quads (lawn blades), so edge-collapse simplification can't reduce it. Instead it is
   thinned: a seeded random subset is kept, weighted towards the camera's flight path
   (x ≈ 0, z 3 → 20), and every kept leaf/blade is enlarged about its own centre so the
   canopies and lawn keep their coverage. The store, glass, doors, sign and paving are
   untouched. Node names (Door_L, Door_R, Glass…) and materials survive: no join/flatten.

   Run from website/tools:
     npm install          (once; see package.json)
     node optimize-store.mjs
*/
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, draco, textureCompress } from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(here, '../assets/00-intro/ssg-store-hq.glb');
const OUT = path.join(here, '../assets/00-intro/ssg-store.web.glb');

// keep: share of components kept near the path (`near`) and far from it (`far`);
// grow: enlargement of each kept component about its centre (xz only for blades)
const THIN = {
  'Fine natural lawn blades': { near: 0.2, far: 0.05, grow: 1.6, flat: true },
  'Natural leafy canopies':   { near: 0.24, far: 0.15, grow: 1.9 },
  'Foliage':                  { near: 0.6, far: 0.4, grow: 1.25, flat: true, only: /GrassBlade/ },
};

// deterministic PRNG so rebuilds are identical
let seed = 0x55a1;
const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

// 0 on the camera path, 1 at 9 m or more from it
function farness(x, z) {
  const dz = z < 3 ? 3 - z : z > 20 ? z - 20 : 0;
  const d = Math.hypot(x, dz) - 3;
  return Math.min(1, Math.max(0, d / 9));
}

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(),
  'draco3d.encoder': await draco3d.createEncoderModule(),
});
const doc = await io.read(SRC);

function thinPrimitive(prim, opts) {
  const pos = prim.getAttribute('POSITION');
  const idxAcc = prim.getIndices();
  const idx = idxAcc ? idxAcc.getArray() : Uint32Array.from({ length: pos.getCount() }, (_, i) => i);
  // connected components (a leaf = 1 triangle, a blade = 2)
  const parent = Int32Array.from({ length: pos.getCount() }, (_, i) => i);
  const find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
  for (let i = 0; i < idx.length; i += 3) {
    const a = find(idx[i]);
    parent[find(idx[i + 1])] = a;
    parent[find(idx[i + 2])] = a;
  }
  const comps = new Map();
  for (let i = 0; i < idx.length; i += 3) {
    const r = find(idx[i]);
    if (!comps.has(r)) comps.set(r, []);
    comps.get(r).push(i);
  }
  const p = pos.getArray();
  const keptTris = [];
  const touched = new Set();
  for (const tris of comps.values()) {
    const verts = new Set();
    tris.forEach((t) => { verts.add(idx[t]); verts.add(idx[t + 1]); verts.add(idx[t + 2]); });
    let cx = 0, cy = 0, cz = 0, minY = Infinity;
    verts.forEach((v) => { cx += p[v * 3]; cy += p[v * 3 + 1]; cz += p[v * 3 + 2]; minY = Math.min(minY, p[v * 3 + 1]); });
    cx /= verts.size; cy /= verts.size; cz /= verts.size;
    const keep = opts.near + (opts.far - opts.near) * farness(cx, cz);
    if (rand() > keep) continue;
    keptTris.push(...tris);
    verts.forEach((v) => {
      if (touched.has(v)) return;
      touched.add(v);
      p[v * 3] = cx + (p[v * 3] - cx) * opts.grow;
      p[v * 3 + 2] = cz + (p[v * 3 + 2] - cz) * opts.grow;
      // blades grow wider, not taller (their roots stay on the ground)
      if (!opts.flat) p[v * 3 + 1] = cy + (p[v * 3 + 1] - cy) * opts.grow;
      else p[v * 3 + 1] = minY + (p[v * 3 + 1] - minY) * 1.1;
    });
  }
  pos.setArray(p);
  const out = new Uint32Array(keptTris.length * 3);
  keptTris.forEach((t, k) => { out[k * 3] = idx[t]; out[k * 3 + 1] = idx[t + 1]; out[k * 3 + 2] = idx[t + 2]; });
  const acc = doc.createAccessor().setType('SCALAR').setArray(out).setBuffer(pos.getBuffer());
  prim.setIndices(acc);
  return [idx.length / 3, out.length / 3];
}

const triCount = (mesh) => mesh.listPrimitives().reduce((s, pr) => s + (pr.getIndices()?.getCount() ?? pr.getAttribute('POSITION').getCount()) / 3, 0);

for (const node of doc.getRoot().listNodes()) {
  const opts = THIN[node.getName()];
  const mesh = node.getMesh();
  if (!opts || !mesh) continue;
  let before = 0, after = 0;
  for (const prim of mesh.listPrimitives()) {
    if (opts.only && !opts.only.test(prim.getMaterial()?.getName() || '')) {
      before += triCount({ listPrimitives: () => [prim] }); after += triCount({ listPrimitives: () => [prim] });
      continue;
    }
    const [b, a] = thinPrimitive(prim, opts);
    before += b; after += a;
  }
  console.log(`${node.getName()}: ${before} -> ${after} triangles`);
}

// prune the now-unreferenced vertices, then textures: max 2048 for the store, 1024 for vegetation and ground
await doc.transform(prune({ keepAttributes: true }), dedup());
const VEG = /^(leaf_|M_Bark|T_Bark|M_Grass|T_Grass|M_Soil|T_Soil|M_Rock|M_Paving|T_Paving|M_Path|T_Path|M_Curb|concrete_)/;
await doc.transform(
  textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 82, resize: [1024, 1024], pattern: VEG }),
  textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 85, resize: [2048, 2048], pattern: /^(?!leaf_|M_Bark|T_Bark|M_Grass|T_Grass|M_Soil|T_Soil|M_Rock|M_Paving|T_Paving|M_Path|T_Path|M_Curb|concrete_)/ }),
  draco({ method: 'edgebreaker', quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 12 }),
);

let total = 0;
doc.getRoot().listMeshes().forEach((m) => { total += triCount(m); });
await io.write(OUT, doc);
const { size } = await import('node:fs').then((fs) => fs.promises.stat(OUT));
console.log(`total ${total} triangles, ${(size / 1024 / 1024).toFixed(2)} MB -> ${path.relative(process.cwd(), OUT)}`);
