#!/usr/bin/env node
/**
 * Generates every raster brand asset from the SVG sources in `brand/`.
 *
 *   node scripts/build-brand-assets.mjs [--check]
 *
 * The SVGs in `brand/` are the single source of truth; nothing here should be
 * hand-edited in the apps. `--check` reports what would change without writing.
 *
 * Why a plate for the icon and a bare mark for the product:
 *   - The plate (solid blue tile, white mark) is opaque, so the favicon and app
 *     icon read identically on light and dark tab bars and need no separate
 *     dark-scheme artwork.
 *   - The plate's rounded square is also the shape the OS will mask, so the
 *     same artwork serves Apple, Android and the PWA.
 *   - The bare mark is used where the surface colour is already known and
 *     controlled (the landing nav, the product sidebar).
 */
import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { chromium } from 'playwright';

const ROOT = process.cwd();
const OUT = process.argv.includes('--check') ? 'check' : 'write';
const written = [];

const svg = (name) => readFileSync(join(ROOT, 'brand', name), 'utf8');

const browser = await chromium.launch();
// The viewport must be at least as large as the biggest asset we rasterise
// (1024) so element screenshots never need to be stitched.
const page = await browser.newPage({ deviceScaleFactor: 1, viewport: { width: 1100, height: 1100 } });

/** Rasterise an SVG string at an exact pixel size, transparent background. */
async function raster(markup, size, { squared = false } = {}) {
  const dataUrl = `data:image/svg+xml;base64,${Buffer.from(markup).toString('base64')}`;
  await page.setContent(
    `<body style="margin:0;background:transparent"><img id="t" src="${dataUrl}" style="display:block;width:${size}px;height:${size}px">`
  );
  // The plate keeps its own rounded corners; squared variants are for surfaces
  // (iOS, Android adaptive layers) that do their own masking.
  const img = page.locator('#t');
  await img.waitFor({ state: 'visible' });
  void squared;
  return img.screenshot({ omitBackground: true });
}

function emit(relPath, buf) {
  written.push(relPath);
  if (OUT === 'check') return;
  const abs = join(ROOT, relPath);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, buf);
}

/* ------------------------------------------------------------------ *
 * Multi-resolution ICO (PNG-compressed entries, Windows Vista+ / all
 * current browsers). Each entry is a full PNG.
 * ------------------------------------------------------------------ */
function buildIco(pngs) {
  const count = pngs.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(count, 4);

  const dir = Buffer.alloc(16 * count);
  let offset = 6 + 16 * count;
  const body = [];
  pngs.forEach(({ size, data }, i) => {
    const e = 16 * i;
    dir.writeUInt8(size >= 256 ? 0 : size, e + 0); // width (0 => 256)
    dir.writeUInt8(size >= 256 ? 0 : size, e + 1); // height
    dir.writeUInt8(0, e + 2); // palette count
    dir.writeUInt8(0, e + 3); // reserved
    dir.writeUInt16LE(1, e + 4); // colour planes
    dir.writeUInt16LE(32, e + 6); // bits per pixel
    dir.writeUInt32LE(data.length, e + 8);
    dir.writeUInt32LE(offset, e + 12);
    offset += data.length;
    body.push(data);
  });
  return Buffer.concat([header, dir, ...body]);
}

/* ------------------------------------------------------------------ *
 * 1. Web app (apps/web/public) and landing (landing/)
 * ------------------------------------------------------------------ */
const plate = svg('logo-plate.svg');
const favicon = svg('favicon.svg');
const square = svg('icon-square.svg');
const bareMark = svg('logo-mark.svg');
const inverseMark = svg('logo-mark-inverse.svg');

const plateSizes = [16, 32, 48, 180, 192, 256, 512, 1024];
const platePng = {};
for (const s of plateSizes) platePng[s] = await raster(plate, s);
const squarePng = {};
for (const s of [180, 192, 512, 1024]) squarePng[s] = await raster(square, s);
const maskPng = {};
for (const s of [192, 512]) maskPng[s] = await raster(square, s);

// --- web app
emit('apps/web/public/favicon.svg', Buffer.from(favicon));
emit('apps/web/public/favicon-16x16.png', platePng[16]);
emit('apps/web/public/favicon-32x32.png', platePng[32]);
emit('apps/web/public/favicon.png', platePng[48]);
emit('apps/web/public/favicon.ico', buildIco([16, 32, 48].map((s) => ({ size: s, data: platePng[s] }))));
emit('apps/web/public/apple-touch-icon.png', squarePng[180]);
emit('apps/web/public/android-chrome-192x192.png', platePng[192]);
emit('apps/web/public/android-chrome-512x512.png', platePng[512]);
emit('apps/web/public/icon-maskable-192x192.png', maskPng[192]);
emit('apps/web/public/icon-maskable-512x512.png', maskPng[512]);
emit('apps/web/public/logo.svg', Buffer.from(plate));
emit('apps/web/public/logo.png', platePng[256]);
emit('apps/web/public/logo-master.png', platePng[1024]);
emit('apps/web/public/logo-mark.svg', Buffer.from(bareMark));
emit('apps/web/public/logo-mark-inverse.svg', Buffer.from(inverseMark));
emit('apps/web/public/assets/logo-white.png', await raster(inverseMark, 256));

// --- landing
emit('landing/favicon.ico', buildIco([16, 32, 48].map((s) => ({ size: s, data: platePng[s] }))));
emit('landing/assets/favicon.svg', Buffer.from(favicon));
emit('landing/assets/favicon-16x16.png', platePng[16]);
emit('landing/assets/favicon-32x32.png', platePng[32]);
emit('landing/assets/favicon.png', platePng[48]);
emit('landing/assets/apple-touch-icon.png', squarePng[180]);
emit('landing/assets/logo-192.png', platePng[192]);
emit('landing/assets/logo-512.png', platePng[512]);
emit('landing/assets/logo.png', platePng[512]);
emit('landing/assets/logo.svg', Buffer.from(plate));
emit('landing/assets/logo-mark.svg', Buffer.from(bareMark));
emit('landing/assets/logo-mark-inverse.svg', Buffer.from(inverseMark));

/* ------------------------------------------------------------------ *
 * 2. Open Graph card — rendered from HTML so it uses the real webfonts.
 * The page is written next to the landing assets so relative font paths and
 * the Google Fonts stylesheet both resolve.
 * ------------------------------------------------------------------ */
const og = `<!doctype html>
<html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  @font-face { font-family:'InterLocal'; src:url('./assets/fonts/Inter-Bold.otf') format('opentype'); font-weight:700; }
  @font-face { font-family:'InterLocal'; src:url('./assets/fonts/Inter-Regular.otf') format('opentype'); font-weight:400; }
  * { box-sizing:border-box; margin:0; }
  body {
    width:1200px; height:630px; display:flex; flex-direction:column; justify-content:space-between;
    padding:64px 72px; position:relative; overflow:hidden;
    background:#0a1220; color:#fff;
    font-family:'Inter','InterLocal',-apple-system,'Segoe UI',sans-serif;
  }
  body::before {
    content:''; position:absolute; inset:0;
    background-image:linear-gradient(#1b2540 1px,transparent 1px),linear-gradient(90deg,#1b2540 1px,transparent 1px);
    background-size:72px 72px; opacity:.35;
    mask-image:radial-gradient(120% 90% at 75% 0%,#000 10%,transparent 70%);
    -webkit-mask-image:radial-gradient(120% 90% at 75% 0%,#000 10%,transparent 70%);
  }
  .glow{position:absolute;right:-160px;top:-220px;width:760px;height:760px;border-radius:50%;
    background:radial-gradient(closest-side,rgba(37,99,235,.55),transparent 70%);filter:blur(10px)}
  .brand{display:flex;align-items:center;gap:18px;position:relative}
  .brand img{width:64px;height:64px;display:block}
  .brand span{font-family:'Plus Jakarta Sans','InterLocal',sans-serif;font-weight:800;font-size:34px;letter-spacing:-.025em}
  h1{position:relative;font-family:'Plus Jakarta Sans','InterLocal',sans-serif;font-weight:800;
    font-size:72px;line-height:1.03;letter-spacing:-.035em;max-width:23ch}
  h1 em{font-style:normal;color:#7ea2ff}
  p{position:relative;font-size:25px;line-height:1.45;color:#a9b4c6;max-width:36ch;margin-top:22px}
  .row{position:relative;display:flex;gap:12px;align-items:center}
  .chip{display:flex;align-items:baseline;gap:9px;padding:12px 20px;border-radius:999px;
    border:1px solid #26324c;background:rgba(16,26,46,.72);font-size:19px;font-weight:500;color:#c3cddf}
  .chip b{font-family:'Plus Jakarta Sans','InterLocal',sans-serif;font-weight:800;font-size:23px;color:#fff}
  .chip i{font-style:normal;color:#8f9bb3;font-size:16px;letter-spacing:.06em;font-weight:600}
</style></head>
<body>
  <div class="glow"></div>
  <div class="brand"><img src="./assets/logo-plate.svg" alt=""><span>Remote Days</span></div>
  <div>
    <h1>Every remote day, <em>counted and provable.</em></h1>
    <p>Cross-border remote-work compliance for employers in France, Belgium and Germany.</p>
  </div>
  <div class="row">
    <div class="chip"><i>FR</i><b>34</b> days</div>
    <div class="chip"><i>BE</i><b>34</b> days</div>
    <div class="chip"><i>DE</i><b>183</b> days</div>
    <div class="chip"><i>Audit trail</i> <b>immutable</b></div>
  </div>
</body></html>`;

emit('landing/assets/logo-plate.svg', Buffer.from(plate));
const tmpHtml = join(ROOT, 'landing', '_og.tmp.html');
writeFileSync(tmpHtml, og);
const ogPage = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await ogPage.goto('file://' + tmpHtml);
await ogPage.evaluate(() => document.fonts.ready);
await ogPage.waitForTimeout(600);
const ogBuf = await ogPage.screenshot({ clip: { x: 0, y: 0, width: 1200, height: 630 } });
emit('landing/assets/og-remotedays.png', ogBuf);
await ogPage.close();

// The temporary OG page must not stay in the repo.
try { unlinkSync(tmpHtml); } catch { /* already gone */ }

await browser.close();

console.log(`${OUT === 'check' ? 'would write' : 'wrote'} ${written.length} assets:`);
for (const w of written) console.log('  ' + w);
