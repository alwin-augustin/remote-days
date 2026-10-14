#!/usr/bin/env node
/**
 * Reads an image and prints it as text: dimensions, dominant palette, and a
 * coarse character map. Useful for reviewing raster brand assets (logos,
 * icons, favicons) where the file itself cannot be viewed directly.
 *
 *   node scripts/inspect-image.mjs path/to/logo.png [more.png ...]
 *
 * Options: --cols N (default 56) --json
 */
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { chromium } from 'playwright';

const argv = process.argv.slice(2);
const colsIdx = argv.indexOf('--cols');
const COLS = colsIdx > -1 ? Number(argv[colsIdx + 1]) : 56;
const asJson = argv.includes('--json');
const files = argv.filter((a, i) => !a.startsWith('--') && i !== colsIdx + 1);

if (files.length === 0) {
  console.error('usage: node scripts/inspect-image.mjs <image> [image...] [--cols N] [--json]');
  process.exit(2);
}

/** Classify one pixel into a single character for the character map. */
function classify(r, g, b, a) {
  if (a < 40) return ' ';
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  const sat = max === 0 ? 0 : (max - min) / max;

  if (sat < 0.18 || max - min < 22) {
    if (l > 0.95) return '.';
    if (l > 0.82) return ':';
    if (l > 0.62) return '-';
    if (l > 0.42) return '=';
    if (l > 0.22) return '+';
    if (l > 0.1) return '#';
    return '@';
  }

  const h =
    (60 *
      (max === r
        ? (g - b) / (max - min) + (g < b ? 6 : 0)
        : max === g
          ? (b - r) / (max - min) + 2
          : (r - g) / (max - min) + 4) +
      360) %
    360;
  const ch =
    h < 15 || h >= 345 ? 'r'
    : h < 45 ? 'o'
    : h < 70 ? 'y'
    : h < 165 ? 'g'
    : h < 195 ? 'c'
    : h < 255 ? 'b'
    : h < 290 ? 'v'
    : 'm';
  return l > 0.6 ? ch.toUpperCase() : ch;
}

const MIME = { svg: 'image/svg+xml', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif' };

const browser = await chromium.launch();
const page = await browser.newPage();
const results = [];

for (const file of files) {
  const ext = basename(file).split('.').pop().toLowerCase();
  const mime = MIME[ext] ?? 'image/png';
  const dataUrl = `data:${mime};base64,${readFileSync(file).toString('base64')}`;

  // Chromium decodes the image and returns a downsampled RGBA buffer.
  const { w, h, pixels } = await page.evaluate(
    async ([url, cols]) => {
      const img = new Image();
      img.src = url;
      await img.decode();
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      const rows = Math.max(1, Math.round((cols * height) / width));
      const canvas = document.createElement('canvas');
      canvas.width = cols;
      canvas.height = rows;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.clearRect(0, 0, cols, rows);
      ctx.drawImage(img, 0, 0, cols, rows);
      const { data } = ctx.getImageData(0, 0, cols, rows);
      return { w: width, h: height, pixels: Array.from(data) };
    },
    [dataUrl, COLS]
  );

  const rows = pixels.length / (COLS * 4);
  const lines = [];
  const tally = new Map();
  for (let y = 0; y < rows; y++) {
    let line = '';
    for (let x = 0; x < COLS; x++) {
      const i = (y * COLS + x) * 4;
      const [r, g, b, a] = [pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3]];
      line += classify(r, g, b, a);
      if (a >= 40) {
        const key = `${r >> 4}-${g >> 4}-${b >> 4}`;
        const e = tally.get(key) ?? { r: 0, g: 0, b: 0, n: 0 };
        e.r += r; e.g += g; e.b += b; e.n++;
        tally.set(key, e);
      }
    }
    lines.push(line);
  }
  const total = COLS * rows;
  const palette = [...tally.values()]
    .sort((a, b) => b.n - a.n)
    .slice(0, 8)
    .map((e) => ({
      hex: '#' + [e.r, e.g, e.b].map((v) => Math.round(v / e.n).toString(16).padStart(2, '0')).join('').toUpperCase(),
      pct: +((100 * e.n) / total).toFixed(1),
    }));

  results.push({ file, w, h, rows, lines, palette });
}

await browser.close();

for (const r of results) {
  if (asJson) {
    console.log(JSON.stringify(r, null, 2));
    continue;
  }
  console.log(`\n${r.file}  ${r.w}x${r.h}`);
  console.log('palette  ' + r.palette.map((p) => `${p.hex} ${p.pct}%`).join('   '));
  console.log(r.lines.join('\n'));
}
