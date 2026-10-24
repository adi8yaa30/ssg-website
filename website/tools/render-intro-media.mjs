/* Renders the store intro's fallback media from the live desktop scene:

     assets/00-intro/store-poster-{landscape,portrait}.webp   establishing shot (mobile, low-power, reduced motion)
     assets/00-intro/store-flyin-{landscape,portrait}.mp4     the fly-in, played on scroll / tap (phones, low-power)

   It opens the page with ?intro=3d&debug in Google Chrome (via playwright-core), poses the scene
   frame by frame with the same path the scroll drives, and encodes the frames with ffmpeg.

   Needs: the dev server on :5173 (python3 -m http.server 5173 --directory website), Google Chrome,
   ffmpeg on the PATH, and `npm install` in this folder. Run from website/tools:
     node render-intro-media.mjs
*/
import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, '../assets/00-intro');
const URL = 'http://localhost:5173/?intro=3d&debug';
const FPS = 30;

const VARIANTS = [
  { name: 'landscape', poster: [1920, 1080], video: [1280, 720], crf: 27 },
  { name: 'portrait', poster: [1080, 2340], video: [720, 1560], crf: 27 },   // 9:19.5 phones; shorter ones crop sky/lawn
];

// The fly-in on a clock, paced exactly like the live visit when the visitor scrolls straight through
// (each stage at its minimum duration, from window.SSG.introPacing), then the committed push:
// p ENTER_AT → 1 over 1.2 s (power1.in) while the view fades to night from 0.4 s over 0.8 s.
const HOLD = 0.6, PUSH = 1.2, AFTER = 0.2;
const clamp01 = (v) => Math.min(1, Math.max(0, v));
function timeline({ STAGES, ENTER_AT }) {
  const frames = [];
  for (let i = 0; i < Math.round(HOLD * FPS); i++) frames.push({ p: 0, veil: 0 });
  let p = 0;
  while (p < ENTER_AT - 1e-6) {
    const st = STAGES.find(([, a, b]) => p < b) || STAGES[STAGES.length - 1];
    p = Math.min(ENTER_AT, p + (st[2] - st[1]) / st[3] / FPS);
    frames.push({ p, veil: 0 });
  }
  for (let i = 1; i <= Math.round((PUSH + AFTER) * FPS); i++) {
    const t = i / FPS;
    const k = clamp01(t / PUSH);
    const v = clamp01((t - 0.4) / 0.8);
    frames.push({ p: ENTER_AT + (1 - ENTER_AT) * k * k, veil: v * v });
  }
  return frames;
}

const dataToFile = (dataUrl, file) => fs.writeFileSync(file, Buffer.from(dataUrl.split(',')[1], 'base64'));

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
page.on('pageerror', (e) => console.error('[page]', e.message));
await page.goto(URL);
await page.waitForFunction(() => window.__ssg?.intro?.store?.ready && !document.getElementById('preloader'), null, { timeout: 90000 });
const pacing = await page.evaluate(() => ({ STAGES: window.SSG.introPacing.STAGES, ENTER_AT: window.SSG.introPacing.ENTER_AT }));
const FRAMES = timeline(pacing);
const DURATION = FRAMES.length / FPS;

for (const v of VARIANTS) {
  // poster: the establishing shot at rest
  await page.evaluate(([w, h]) => window.__ssg.intro.store.capture.begin(w, h), v.poster);
  const poster = await page.evaluate(() => window.__ssg.intro.store.capture.shot({ p: 0, t: 0, type: 'image/webp', quality: 0.82 }));
  const posterFile = path.join(OUT, `store-poster-${v.name}.webp`);
  dataToFile(poster, posterFile);
  await page.evaluate(() => window.__ssg.intro.store.capture.end());

  // video frames
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `ssg-intro-${v.name}-`));
  await page.evaluate(([w, h]) => window.__ssg.intro.store.capture.begin(w, h), v.video);
  const n = FRAMES.length - 1;
  for (let i = 0; i <= n; i++) {
    const t = i / FPS;
    const { p, veil } = FRAMES[i];
    const jpg = await page.evaluate((o) => window.__ssg.intro.store.capture.shot(o), { p, t, veil, type: 'image/jpeg', quality: 0.93 });
    dataToFile(jpg, path.join(dir, `f${String(i).padStart(4, '0')}.jpg`));
  }
  await page.evaluate(() => window.__ssg.intro.store.capture.end());
  const videoFile = path.join(OUT, `store-flyin-${v.name}.mp4`);
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-framerate', String(FPS), '-i', path.join(dir, 'f%04d.jpg'),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', String(v.crf), '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', videoFile]);
  fs.rmSync(dir, { recursive: true, force: true });
  const kb = (f) => `${(fs.statSync(f).size / 1024).toFixed(0)} KB`;
  console.log(`${v.name}: poster ${kb(posterFile)}, video ${kb(videoFile)} (${n + 1} frames, ${DURATION.toFixed(1)} s)`);
}
await browser.close();
