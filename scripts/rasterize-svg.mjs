#!/usr/bin/env node
/**
 * Rasterises SVG files to PNG at exact pixel sizes using Chromium, with a
 * transparent background.
 *
 *   node scripts/rasterize-svg.mjs <input.svg> --out dir --sizes 16,32,192,512 [--prefix name]
 *   node scripts/rasterize-svg.mjs <in.svg> --sheet a.svg:16 b.svg:32 ...
 *
 * Notes
 *  - The SVG is rendered as an <img> at the requested CSS size with
 *    deviceScaleFactor 1, so a "16" really is 16x16 device pixels. Strokes do
 *    not get sub-pixel antialiasing that a larger raster would hide, which is
 *    the point: it shows what a favicon actually looks like.
 *  - `--sheet` writes one PNG per "file:size" pair into --out, using the file's
 *    base name; used for side-by-side comparisons of design candidates.
 */
import { mkdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { chromium } from 'playwright';

const argv = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const i = argv.indexOf(`--${name}`);
  return i > -1 ? argv[i + 1] : fallback;
};
const outDir = flag('out', '.');
const sizesArg = flag('sizes', '');
const prefix = flag('prefix');
const sheet = argv.filter((a) => a.includes(':') && (a.endsWith('.svg') || /\.svg:\d+$/.test(a)));

const jobs = [];
if (sheet.length) {
  for (const item of sheet) {
    const idx = item.lastIndexOf(':');
    jobs.push({ file: item.slice(0, idx), size: Number(item.slice(idx + 1)) });
  }
} else {
  const input = argv[0];
  const sizes = sizesArg.split(',').filter(Boolean).map(Number);
  for (const size of sizes) jobs.push({ file: input, size });
}

if (!jobs.length) {
  console.error('usage: node scripts/rasterize-svg.mjs <in.svg> --sizes 16,32 [--out dir] [--prefix p]');
  process.exit(2);
}

mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1, viewport: { width: 600, height: 600 } });
await page.setContent('<body style="margin:0;background:transparent"></body>');

const written = [];
for (const { file, size } of jobs) {
  const svg = readFileSync(file, 'utf8');
  const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  await page.setContent(
    `<body style="margin:0;background:transparent"><img id="t" src="${dataUrl}" style="display:block;width:${size}px;height:${size}px">`
  );
  const img = page.locator('#t');
  await img.waitFor({ state: 'visible' });

  // A sheet run writes one file per (svg, size); a single-file run honours --prefix.
  const stem = basename(file).replace(/\.svg$/, '');
  const base = sheet.length ? `${stem}-${size}` : (prefix ?? stem);
  const out = join(outDir, `${base}.png`);
  await img.screenshot({ path: out, omitBackground: true });
  written.push(`${out} (${size}x${size})`);
}

await browser.close();
console.log(written.join('\n'));
