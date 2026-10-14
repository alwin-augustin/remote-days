# Remote Days — brand identity

## The mark

The mark is two elements, always separate:

- **The day** — a disc. The unit the product counts.
- **The threshold** — a rule. The statutory limit that day is measured against.

Placed together they read as the product's whole job: *a remote day, counted and
measured against a country's limit.* The gap between them is structural, not
decorative — the two shapes must never touch, because at 16 px a merged blob stops
reading as two things (this was tested; see "Working at 16 px" below).

The rule is wider than the disc on purpose: it reads as a *line* the day sits on,
not a base the day stands on.

## Sources of truth

Everything lives in `brand/`. **Nothing in `apps/` is hand-edited** — the raster
assets there are generated.

| File | What it is | Use on |
| --- | --- | --- |
| `logo-mark.svg` | The mark, brand blue | Light surfaces with a known background |
| `logo-mark-inverse.svg` | The mark, white | Brand-blue and dark surfaces |
| `logo-mark-mono.svg` | The mark, `currentColor` | Inline SVG where CSS sets the colour |
| `logo-plate.svg` | Mark on a solid blue tile, rounded | Favicon, app icon, anywhere the background is unknown |
| `icon-square.svg` | Mark on a full-bleed blue square, inside the maskable safe area | iOS home screen, Android adaptive layers, maskable PWA icons |
| `favicon.svg` | Identical to the plate | `<link rel="icon" type="image/svg+xml">` |

### Which variant, where

- **Plate = the icon.** Anything the OS, browser or a bookmark bar draws for us.
  It is opaque, so a single file is correct on light *and* dark chrome — there is
  deliberately no dark-scheme favicon.
- **Bare mark = the logo.** Places where we control the surface: the landing
  header, the product sidebar, the login card.
- **Inverse mark = the brand surface.** The mobile app (every screen behind it is
  the blue gradient) and the email header.
- **Square/icon-square = the masked surfaces.** iOS and Android crop the icon to
  their own shape, so this artwork is full-bleed with the mark kept inside the
  safe area.

## Colour

| Token | Value | Where |
| --- | --- | --- |
| Brand blue | `#2563EB` | The mark on light surfaces; product `--primary` |
| Plate blue | `#1D4ED8` | Plate/icon backgrounds; email and splash gradients |
| Ink | `#0A1220` | Wordmark on light |
| Inverse | `#FFFFFF` | Mark on brand blue or dark |
| Dark-UI accent | `#60A5FA` | Product `--primary` in dark mode |

These are existing product tokens, not new ones: `#2563EB`, `#1D4ED8` and
`#0A1220` are already the landing and app palette values.

## Type

The wordmark is **"Remote Days"** — two words, capital R, capital D, no hyphen.

- Web: Plus Jakarta Sans ExtraBold (800), `letter-spacing: -0.02em`.
- Product/email: the app's font stack (Inter first), weight 700–800.
- Never set it as "remotedays" or "RemoteDays". The single exception is the PWA
  `short_name`, which is capped for home-screen label width.

## Clear space and minimum sizes

**Clear space:** a margin of **25% of the mark's width** on all four sides (16
units of the 64-unit grid), with no other element — text, rules, image edges —
inside it.

**Minimum sizes:**

| Asset | Digital | Print |
| --- | --- | --- |
| Bare mark | 16 px | 6 mm |
| Plate / icon | 16 px | 6 mm |
| Lockup (mark + wordmark) | 20 px mark height | 6 mm mark height |

In the lockup, the gap between the plate and the wordmark is **half the plate
width**, and the plate's optical centre sits on the wordmark's cap height.

## Working at 16 px

A favicon is the hardest thing the mark has to do, so it was designed against it
rather than scaled down to it. Two rules came out of that testing and are not
negotiable:

1. **The disc and the rule never merge.** Same-colour shapes that touch become a
   single blob below ~24 px, and the meaning is lost.
2. **Nothing thinner than 2 px at 16 px.** Thin frames and hairlines vanish
   entirely. Every element here is a solid fill, so nothing depends on stroke
   width.

## Don't

- Don't recolour the mark outside the table above.
- Don't add shadows, gradients, outlines or strokes.
- Don't rotate, skew, condense or stretch it; don't re-space the disc and rule.
- Don't remove the gap, or let the disc and rule touch.
- Don't put the bare mark on a photograph or a busy/low-contrast background —
  use the plate.
- Don't typeset the wordmark in another face, or recreate the mark by hand.
- Don't scale below the minimum sizes; use the plate instead of squeezing the
  bare mark.

## Regenerating the assets

```bash
node scripts/build-brand-assets.mjs           # write every raster asset
node scripts/build-brand-assets.mjs --check   # list what it would write
```

The script rasterises each SVG at exact device sizes with Chromium (no ImageMagick
or `sharp` needed), packs the multi-resolution `favicon.ico`, and renders the Open
Graph card from HTML so it uses the real webfonts. Run it after any change to
`brand/*.svg`, and commit the results.

Two helper scripts are useful when reviewing:

```bash
node scripts/rasterize-svg.mjs brand/logo-mark.svg --sizes 16,32,192,512 --out /tmp/x
node scripts/inspect-image.mjs /tmp/x/logo-mark.png --cols 16   # true 16 px pixels
```

`inspect-image.mjs` prints an image as a character map, which is how the mark was
checked at favicon size.

## Asset map

| Path | Written by | Consumed by |
| --- | --- | --- |
| `apps/web/public/favicon.{svg,ico}`, `favicon-*.png`, `apple-touch-icon.png`, `android-chrome-*.png`, `icon-maskable-*.png` | build script | `apps/web/index.html`, `manifest.json` |
| `apps/web/public/logo.svg`, `logo.png`, `logo-master.png`, `logo-mark*.svg` | build script | product sidebar, login card |
| `apps/web/public/assets/logo-white.png` | build script | email header (`email-templates.ts`) |
| `landing/assets/*` | build script | landing page, legal pages, and the OG card (rendered from HTML that references `logo-plate.svg`) |
