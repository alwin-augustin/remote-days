/**
 * Capture real product screenshots for the marketing landing page.
 *
 * Runs the locally built web app in Chromium and writes WebP images into
 * landing/assets/app/, sized for the web:
 *   - desktop 1600px wide (a 2x asset for the ~700-1070px display width)
 *   - mobile   780px wide (a 2x asset for a ~313px phone frame)
 *
 * Screenshots are taken of the app UI only (no browser chrome) — the landing
 * page draws its own window and phone frames around them.
 *
 * Usage:
 *   node scripts/capture-landing-screenshots.mjs
 *   APP_BASE_URL=http://localhost:5173 node scripts/capture-landing-screenshots.mjs
 *
 * The last step shells out to `sips` and `cwebp`. If either is missing the PNGs
 * are left in place instead, with a warning.
 */
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdir, readdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';

const BASE = process.env.APP_BASE_URL ?? 'http://localhost:5173';
const OUT_DIR = path.resolve('landing/assets/app');

const ACCOUNTS = {
  admin: { email: 'admin@remotedays.app', password: 'password123' },
  employee: { email: 'employee@remotedays.app', password: 'password123' },
};

// Third-party scripts are blocked so no consent banner or analytics tag ends up
// baked into a marketing screenshot.
const BLOCKED_HOSTS = [
  'consent.cookiebot.com',
  'www.googletagmanager.com',
  'www.google-analytics.com',
];

const DESKTOP = { viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 };
const MOBILE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 };

/**
 * Each entry maps to one image the landing page actually displays. Keep this
 * list and the <img src> paths in landing/index.html in step — anything listed
 * here ends up in the deployed bundle.
 *
 * @type {{file: string, path: string, as?: keyof typeof ACCOUNTS | null, device?: 'desktop'|'mobile', waitFor?: string}[]}
 */
const SHOTS = [
  // Hero: the HR Compliance Hub
  { file: 'app-compliance-hub', path: '/hr', as: 'admin', waitFor: 'main' },

  // Product tour tabs
  { file: 'app-dashboard-employee', path: '/', as: 'employee', waitFor: 'main' },
  { file: 'app-compliance-employee', path: '/compliance', as: 'employee', waitFor: 'main' },
  { file: 'app-employee-detail', path: 'AUTO_EMPLOYEE', as: 'admin', waitFor: 'main' },
  { file: 'app-employees', path: '/hr/employees', as: 'admin', waitFor: 'main' },
  { file: 'app-requests-admin', path: '/admin/requests', as: 'admin', waitFor: 'main' },
  { file: 'app-audit', path: '/admin/audit', as: 'admin', waitFor: 'main' },
  { file: 'app-countries', path: '/admin/countries', as: 'admin', waitFor: 'main' },

  // Mobile web — the employee declaring from a phone
  { file: 'app-mobile-home', path: '/', as: 'employee', device: 'mobile', waitFor: 'main' },
  { file: 'app-mobile-calendar', path: '/calendar', as: 'employee', device: 'mobile', waitFor: 'main' },
  { file: 'app-mobile-compliance', path: '/compliance', as: 'employee', device: 'mobile', waitFor: 'main' },
];

const HIDE_STYLE = `
  [id^="CybotCookiebot"], #onetrust-consent-sdk, [data-sonner-toaster], [role="status"].toaster { display: none !important; }
  *, *::before, *::after { animation: none !important; transition: none !important; }
`;

async function newContext(browser, device) {
  return browser.newContext({
    ...(device === 'mobile' ? MOBILE : DESKTOP),
    colorScheme: 'light',
    reducedMotion: 'reduce',
    locale: 'en-GB',
    timezoneId: 'Europe/Luxembourg',
  });
}

async function prepare(page) {
  await page.route('**/*', (route) => {
    const url = route.request().url();
    if (BLOCKED_HOSTS.some((host) => url.includes(host))) return route.abort();
    return route.continue();
  });
}

async function login(page, account) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.fill('input[name="email"]', account.email);
  await page.fill('input[name="password"]', account.password);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 20000 }),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForLoadState('networkidle').catch(() => {});
}

async function capture(page, file) {
  await page.addStyleTag({ content: HIDE_STYLE }).catch(() => {});
  await page.waitForTimeout(650);
  await page.screenshot({
    path: path.join(OUT_DIR, `${file}.png`),
    animations: 'disabled',
    caret: 'hide',
  });
}

async function run() {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();

  // Group the work so we log in once per (account, device) pair.
  const jobs = new Map();
  for (const shot of SHOTS) {
    const device = shot.device ?? 'desktop';
    const key = `${shot.as ?? 'anonymous'}::${device}`;
    if (!jobs.has(key)) jobs.set(key, { account: shot.as, device, shots: [] });
    jobs.get(key).shots.push(shot);
  }

  for (const [key, job] of jobs) {
    const context = await newContext(browser, job.device);
    const page = await context.newPage();
    await prepare(page);

    if (job.account) {
      await login(page, ACCOUNTS[job.account]);
    }

    for (const shot of job.shots) {
      let target = shot.path;

      if (target === 'AUTO_EMPLOYEE') {
        // Resolve a concrete employee id from the employee list.
        await page.goto(`${BASE}/hr/employees`, { waitUntil: 'domcontentloaded' });
        await page.waitForLoadState('networkidle').catch(() => {});
        const href = await page
          .locator('a[href*="/hr/employees/"]')
          .first()
          .getAttribute('href')
          .catch(() => null);
        if (!href) {
          console.warn(`  ! could not resolve an employee id, skipping ${shot.file}`);
          continue;
        }
        target = href;
      }

      await page.goto(`${BASE}${target}`, { waitUntil: 'domcontentloaded' });
      if (shot.waitFor && !shot.waitFor.startsWith('text=')) {
        await page.waitForSelector(shot.waitFor, { timeout: 15000 }).catch(() => {});
      } else if (shot.waitFor) {
        await page.getByText(shot.waitFor.slice(5)).first().waitFor({ timeout: 15000 }).catch(() => {});
      }
      await page.waitForLoadState('networkidle').catch(() => {});
      await capture(page, shot.file);
      console.log(`  ✓ ${shot.file}.png  (${key} → ${target})`);
    }

    await context.close();
  }

  await browser.close();
  console.log(`\nRaw captures written to ${OUT_DIR}`);
  await optimiseForWeb();
}

/**
 * Resize each capture to its web width and convert it to WebP, replacing the
 * PNG. Keeps the deployed landing assets small without touching the layout
 * (the browser still renders the app at full desktop width).
 */
async function optimiseForWeb() {
  const names = (await readdir(OUT_DIR)).filter((f) => f.endsWith('.png'));
  if (names.length === 0) {
    console.log('Nothing to optimise.');
    return;
  }

  const has = (bin) => {
    try {
      execFileSync('which', [bin], { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  };

  if (!has('sips') || !has('cwebp')) {
    console.warn(
      '\n! sips and/or cwebp not found: leaving PNGs at capture resolution.\n' +
      '  Install them (macOS ships sips; cwebp is in webp/homebrew) to emit web-ready WebP.'
    );
    return;
  }

  let savedFrom = 0;
  let savedTo = 0;
  for (const name of names) {
    const file = path.join(OUT_DIR, name);
    const width = name.includes('mobile') ? 780 : 1600;
    const webp = path.join(OUT_DIR, `${name.replace(/\.png$/, '')}.webp`);

    const before = (await stat(file)).size;
    execFileSync('sips', ['--resampleWidth', String(width), file], { stdio: 'ignore' });
    execFileSync('cwebp', ['-quiet', '-q', '84', '-m', '6', file, '-o', webp], { stdio: 'ignore' });
    await rm(file);

    savedFrom += before;
    savedTo += (await stat(webp)).size;
  }

  const kb = (n) => `${Math.round(n / 1024)} KB`;
  console.log(`Optimised ${names.length} images: ${kb(savedFrom)} PNG → ${kb(savedTo)} WebP`);
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
