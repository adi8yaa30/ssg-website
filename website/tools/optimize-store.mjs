/* Builds the web version of the store intro model.

     assets/00-intro/ssg-store-hq.glb  (30 MB, ~986k triangles)
       -> assets/00-intro/ssg-store.web.glb

   The vegetation is made of single triangles (leaves, foliage blades) and two-triangle
   quads (lawn blades), so edge-collapse simplification can't reduce it. Instead it is
   thinned: a seeded random subset is kept, weighted towards the camera's flight path
   (x ≈ 0, z 3 → 20), and every kept leaf/blade is enlarged about its own centre so the
   canopies and lawn keep their coverage. The store, glass, doors, sign and paving are
   untouched. Node names (Door_L, Door_R, Glass…) and materials survive: no join/flatten.
   Textures are re-encoded per role (see below) rather than with one lossy quality.

   Run from website/tools:
     npm install          (once; see package.json)
     node optimize-store.mjs
*/
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, draco } from '@gltf-transform/functions';
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
  'Fine natural lawn blades': { near: 0.34, far: 0.07, grow: 1.4, flat: true },
  'Natural leafy canopies':   { near: 0.34, far: 0.22, grow: 1.6 },
  'Foliage':                  { near: 0.8, far: 0.55, grow: 1.12, flat: true, only: /GrassBlade/ },
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

// prune the now-unreferenced vertices
await doc.transform(prune({ keepAttributes: true }), dedup());

// Textures. The source's are near-lossless WebP (15.8 MB), and a blanket lossy re-encode (q82) left
// several at 3–8 % of their data: visibly smeared wood, paving, cladding and leaves. Each map is
// re-encoded for its role instead, and keeps the original bytes whenever that isn't smaller:
//   colour maps     lossy WebP q94 (sRGB, what the eye sees)
//   normal maps     near-lossless WebP (lossy compression breaks the encoded directions)
//   roughness / AO  lossy WebP q90 (smooth data)
// and nothing is larger than 2048 px (1024 for vegetation and ground, 512 for the unseen roof).
const SMALL = /^(leaf_|M_Bark|T_Bark|M_Grass|T_Grass|M_Soil|T_Soil|M_Rock|M_Paving|T_Paving|M_Path|T_Path|M_Curb|concrete_)/;
for (const tex of doc.getRoot().listTextures()) {
  const name = tex.getName() || '';
  const src = Buffer.from(tex.getImage());
  // the flat roof is above the camera the whole visit, so its maps can be small
  const max = /^roof_/.test(name) ? 512 : SMALL.test(name) ? 1024 : 2048;
  let img = sharp(src);
  const meta = await img.metadata();
  if (Math.max(meta.width, meta.height) > max) img = img.resize(max, max, { fit: 'inside' });
  const opts = /normal/i.test(name) ? { nearLossless: true, quality: 60, effort: 6 }
    : /rough|AO/i.test(name) ? { quality: 90, effort: 6 }
      : { quality: 94, smartSubsample: true, effort: 6 };
  const out = await img.webp(opts).toBuffer();
  const resized = Math.max(meta.width, meta.height) > max;
  if (out.length < src.length || resized || tex.getMimeType() !== 'image/webp') {
    tex.setImage(new Uint8Array(out)).setMimeType('image/webp');
    if (tex.getURI()) tex.setURI(tex.getURI().replace(/\.\w+$/, '.webp'));
  }
}
// geometry: 14-bit UVs (tiled paving and cladding span many repeats) and 12-bit normals (smooth shading)
await doc.transform(draco({ method: 'edgebreaker', quantizePosition: 14, quantizeNormal: 12, quantizeTexcoord: 14 }));

let total = 0;
doc.getRoot().listMeshes().forEach((m) => { total += triCount(m); });
await io.write(OUT, doc);
const { size } = await import('node:fs').then((fs) => fs.promises.stat(OUT));
console.log(`total ${total} triangles, ${(size / 1024 / 1024).toFixed(2)} MB -> ${path.relative(process.cwd(), OUT)}`);
