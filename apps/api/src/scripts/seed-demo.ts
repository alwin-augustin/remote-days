/**
 * Demo data seeder.
 *
 * Produces a coherent, current-year dataset for the Remote Days demo:
 *  - 101 employees split across the five compliance tiers, with home-day counts
 *    derived from each employee's own residence-country threshold (FR/BE = 34,
 *    DE = 183) so every tier in the HR risk dashboard is populated.
 *  - Work entries for the *current year* only (the compliance queries count the
 *    current calendar year, so any other year renders as zero).
 *  - Full status coverage — every value of the `work_status` enum
 *    (home/office/travel/sick/unknown) — plus deliberately undeclared days, so
 *    the daily stats, the "missing declarations" panel and the HR override
 *    dialog (which offers "Unknown") all have real data behind them.
 *  - Holidays for the current year, including Easter-derived movable feasts.
 *
 * The seeder is deterministic (seeded PRNG) and idempotent: it truncates the
 * demo tables and re-inserts inside a single transaction guarded by a Postgres
 * advisory lock, so overlapping runs (e.g. a nightly cron) cannot interleave.
 *
 * This module is pure — it has no side effects on import. Run it via
 * `seed-demo.cli.ts` or call `seedDemoData()` from the scheduler.
 */
import * as bcrypt from 'bcrypt';
import { Pool, PoolClient } from 'pg';
import { addDays, eachDayOfInterval, format, isWeekend, startOfYear } from 'date-fns';

export const DEMO_PASSWORD = 'password123';
/** Arbitrary constant key for pg_advisory_xact_lock during a seed run. */
export const DEMO_SEED_LOCK_KEY = 4825001;

export interface SeedOptions {
  /** Reference "today" — defaults to now. Dates are generated from Jan 1 to this day. */
  now?: Date;
  password?: string;
  /** Fixed PRNG seed so repeated runs produce identical demo data. */
  randomSeed?: number;
  log?: (message: string) => void;
}

export interface SeedSummary {
  year: number;
  users: number;
  employees: number;
  entries: number;
  holidays: number;
  requests: number;
  notifications: number;
  pushTokens: number;
  pushLogs: number;
  loginAttempts: number;
  securityEvents: number;
  auditLogs: number;
  distribution: Record<string, number>;
}

/**
 * Residence-country remote-work allowance. LU is effectively unlimited (HQ).
 *
 * DE is 183 (not 34): the documented business rule, `@remotedays/shared`
 * COMPLIANCE_LIMITS and the web app's COUNTRY_LABELS all use 183. Note that
 * docker/postgres/init.sql still seeds DE = 34 — the seeder upserts the correct
 * values, but a freshly initialised database without a seed has the wrong DE row.
 */
const THRESHOLDS: Record<string, number> = { FR: 34, BE: 34, DE: 183, LU: 999 };

type BucketKey = 'safe' | 'moderate' | 'high' | 'critical' | 'exceeded';

/**
 * Target distribution of the 100 generated employees. `minPct`/`maxPct` are a
 * percentage of the employee's *own* threshold, so the same split works for
 * both the 34-day (FR/BE) and 183-day (DE) allowances.
 */
const BUCKETS: Array<{ key: BucketKey; count: number; minPct: number; maxPct: number }> = [
  { key: 'safe', count: 34, minPct: 15, maxPct: 45 },
  { key: 'moderate', count: 24, minPct: 52, maxPct: 72 },
  { key: 'high', count: 20, minPct: 78, maxPct: 88 },
  { key: 'critical', count: 12, minPct: 92, maxPct: 98 },
  { key: 'exceeded', count: 10, minPct: 102, maxPct: 108 },
];

const FIRST_NAMES = [
  'Emma', 'Louis', 'Chloé', 'Lucas', 'Léa', 'Hugo', 'Manon', 'Gabriel', 'Inès', 'Raphaël',
  'Camille', 'Arthur', 'Sarah', 'Jules', 'Jade', 'Adam', 'Louise', 'Léo', 'Alice', 'Nathan',
  'Lina', 'Tom', 'Eva', 'Mathis', 'Anna', 'Enzo', 'Zoé', 'Noah', 'Clara', 'Théo',
  'Charlotte', 'Maxime', 'Marie', 'Alexandre', 'Juliette', 'Paul', 'Lucie', 'Ethan', 'Rose', 'Victor',
  'Sophie', 'Antoine', 'Margot', 'Clément', 'Ambre', 'Benjamin', 'Romane', 'Quentin', 'Océane', 'Simon',
];

const LAST_NAMES = [
  'Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau',
  'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garcia', 'David', 'Bertrand', 'Roux', 'Vincent', 'Fournier',
  'Morel', 'Girard', 'André', 'Lefevre', 'Mercier', 'Dupont', 'Lambert', 'Bonnet', 'François', 'Martinez',
  'Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Schulz', 'Hoffmann',
  'Peeters', 'Janssens', 'Maes', 'Jacobs', 'Willems', 'Claes', 'Goossens', 'Wouters', 'De Smedt', 'Hermans',
];

const REQUEST_REASONS = [
  'I forgot to declare my status for this day',
  'System was down when I tried to declare',
  'Misclicked and selected wrong option',
  'Had to work from home due to emergency',
  'Doctor appointment required home office',
  'Child was sick, had to stay home',
  'Public transport strike',
  'Internet issue prevented declaration',
  'Was traveling for client meeting',
  'Conference call required quiet environment',
];

const IP_ADDRESSES = [
  '192.168.1.100', '192.168.1.101', '10.0.0.50', '10.0.0.51', '172.16.0.10',
  '172.16.0.11', '82.165.120.45', '91.121.85.33', '213.186.33.5', '176.31.254.23',
  '51.255.68.100', '37.59.42.88', '185.234.219.50', '195.154.161.11', '78.193.78.21', '80.67.169.12',
];

const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (iPad; CPU OS 17_2_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
  'RemoteDays/1.0.0 (iOS; iPhone15,2)',
  'RemoteDays/1.0.0 (Android; Pixel 8 Pro)',
];

const OVERRIDE_REASONS = [
  'Employee requested correction via email',
  'Data entry error identified by HR',
  'Manager confirmed incorrect declaration',
  'Compliance audit correction',
  'System sync issue resolved',
  'Employee on approved leave - auto-corrected',
];

const DEVICE_NAMES = ['iPhone 15 Pro', 'iPhone 14', 'Pixel 8 Pro', 'Samsung Galaxy S24', 'iPad Pro', 'MacBook Pro'];

// ---------------------------------------------------------------------------
// Deterministic RNG + small helpers
// ---------------------------------------------------------------------------

/** mulberry32 — tiny, fast, deterministic PRNG. */
function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rng = () => number;

const randInt = (rng: Rng, min: number, max: number): number => Math.floor(rng() * (max - min + 1)) + min;

function pick<T>(rng: Rng, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function shuffle<T>(rng: Rng, arr: readonly T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function sanitize(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

const iso = (date: Date): string => format(date, 'yyyy-MM-dd');
const toTimestamp = (date: Date): string => date.toISOString();

function randomTimestampWithinDays(rng: Rng, daysBack: number): Date {
  const msBack = Math.max(daysBack, 1) * 24 * 60 * 60 * 1000;
  return new Date(Date.now() - Math.floor(rng() * msBack));
}

/** Weekdays from Jan 1 of `year` up to and including `now`. */
export function generateWorkDays(year: number, now: Date): string[] {
  const start = startOfYear(new Date(year, 0, 1));
  const endOfYear = new Date(year, 11, 31);
  const end = now < endOfYear ? now : endOfYear;
  return eachDayOfInterval({ start, end })
    .filter((day) => !isWeekend(day))
    .map(iso);
}

/** Meeus/Jones/Butcher Gregorian Easter algorithm. */
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

interface Holiday {
  date: string;
  country: string;
  description: string;
}

/** Public holidays for LU/FR/BE/DE in the given year, incl. movable feasts. */
export function buildHolidays(year: number): Holiday[] {
  const easter = easterSunday(year);
  const move = (offset: number) => iso(addDays(easter, offset));

  const holiday = (date: string, country: string, description: string): Holiday => ({ date, country, description });
  const all = (date: string, description: string): Holiday[] =>
    ['LU', 'FR', 'BE', 'DE'].map((country) => holiday(date, country, description));

  return [
    ...all(iso(new Date(year, 0, 1)), "New Year's Day"),
    holiday(move(-2), 'DE', 'Good Friday'),
    ...all(move(1), 'Easter Monday'),
    ...all(iso(new Date(year, 4, 1)), 'Labour Day'),
    holiday(iso(new Date(year, 4, 8)), 'FR', 'Victory in Europe Day'),
    holiday(iso(new Date(year, 4, 9)), 'LU', 'Europe Day'),
    ...all(move(39), 'Ascension Day'),
    ...all(move(50), 'Whit Monday'),
    holiday(iso(new Date(year, 5, 23)), 'LU', 'National Day'),
    holiday(iso(new Date(year, 6, 14)), 'FR', 'Bastille Day'),
    holiday(iso(new Date(year, 6, 21)), 'BE', 'Belgian National Day'),
    holiday(iso(new Date(year, 7, 15)), 'LU', 'Assumption Day'),
    holiday(iso(new Date(year, 7, 15)), 'FR', 'Assumption Day'),
    holiday(iso(new Date(year, 7, 15)), 'BE', 'Assumption Day'),
    holiday(iso(new Date(year, 9, 3)), 'DE', 'Day of German Unity'),
    holiday(iso(new Date(year, 10, 1)), 'LU', "All Saints' Day"),
    holiday(iso(new Date(year, 10, 1)), 'FR', "All Saints' Day"),
    holiday(iso(new Date(year, 10, 1)), 'BE', "All Saints' Day"),
    holiday(iso(new Date(year, 10, 11)), 'FR', 'Armistice Day'),
    holiday(iso(new Date(year, 10, 11)), 'BE', 'Armistice Day'),
    ...all(iso(new Date(year, 11, 25)), 'Christmas Day'),
    holiday(iso(new Date(year, 11, 26)), 'LU', "St. Stephen's Day"),
    holiday(iso(new Date(year, 11, 26)), 'DE', 'Second Day of Christmas'),
  ];
}

function pickEmployeeCountry(rng: Rng, bucket: BucketKey): 'FR' | 'BE' | 'DE' {
  // Risky tiers skew toward the 34-day neighbours; DE (183 days) leans safe.
  const weights: Array<[('FR' | 'BE' | 'DE'), number]> =
    bucket === 'safe' ? [['FR', 0.35], ['BE', 0.3], ['DE', 0.35]] : [['FR', 0.45], ['BE', 0.35], ['DE', 0.2]];
  const roll = rng();
  let cumulative = 0;
  for (const [country, weight] of weights) {
    cumulative += weight;
    if (roll <= cumulative) return country;
  }
  return 'FR';
}

/** Insert entries in batched multi-row statements (fast, param-limit safe). */
async function bulkInsertEntries(
  client: PoolClient,
  rows: Array<{ userId: string; date: string; status: string }>
): Promise<void> {
  const CHUNK_SIZE = 500; // 1500 bind params per statement
  for (let offset = 0; offset < rows.length; offset += CHUNK_SIZE) {
    const chunk = rows.slice(offset, offset + CHUNK_SIZE);
    const values: string[] = [];
    const params: unknown[] = [];
    chunk.forEach((row, index) => {
      const base = index * 3;
      values.push(`($${base + 1}, $${base + 2}, $${base + 3}, 'seed')`);
      params.push(row.userId, row.date, row.status);
    });
    await client.query(
      `INSERT INTO entries (user_id, date, status, source) VALUES ${values.join(', ')} ON CONFLICT (user_id, date) DO NOTHING`,
      params
    );
  }
}

// ---------------------------------------------------------------------------
// Seeder
// ---------------------------------------------------------------------------

export async function seedDemoData(pool: Pool, options: SeedOptions = {}): Promise<SeedSummary> {
  const now = options.now ?? new Date();
  const year = now.getFullYear();
  const password = options.password ?? DEMO_PASSWORD;
  const rng = createRng(options.randomSeed ?? 20260101 + year);
  const log = options.log ?? ((message: string) => console.log(message));
  const saltRounds = 10;

  const client = await pool.connect();
  try {
    log(`=== Demo seed (${year}) ===`);
    await client.query('BEGIN');
    // Serialise concurrent seed runs (e.g. overlapping cron ticks).
    await client.query('SELECT pg_advisory_xact_lock($1)', [DEMO_SEED_LOCK_KEY]);

    // 1. Reset demo data.
    await client.query(`
      TRUNCATE TABLE
        push_notification_logs, push_tokens, security_events, login_attempts,
        requests, notifications, audit_logs, email_cta_tokens, entries, users, holidays
      RESTART IDENTITY CASCADE;
    `);
    log('  cleared demo tables');

    // 2. Reference data.
    for (const [country, days] of Object.entries(THRESHOLDS)) {
      await client.query(
        `INSERT INTO country_thresholds (country_code, max_remote_days) VALUES ($1, $2)
         ON CONFLICT (country_code) DO UPDATE SET max_remote_days = EXCLUDED.max_remote_days`,
        [country, days]
      );
    }

    const holidays = buildHolidays(year);
    for (const item of holidays) {
      await client.query(
        `INSERT INTO holidays (date, country_code, description) VALUES ($1, $2, $3)
         ON CONFLICT (date, country_code) DO NOTHING`,
        [item.date, item.country, item.description]
      );
    }
    log(`  ${holidays.length} ${year} holidays, ${Object.keys(THRESHOLDS).length} thresholds`);

    // 3. Accounts.
    const passwordHash = await bcrypt.hash(password, saltRounds);
    const insertUser = async (
      email: string,
      firstName: string,
      lastName: string,
      residence: string,
      role: string
    ): Promise<string> => {
      const { rows } = await client.query<{ user_id: string }>(
        `INSERT INTO users (email, first_name, last_name, country_of_residence, work_country, password_hash, role, is_active)
         VALUES ($1, $2, $3, $4, 'LU', $5, $6, true) RETURNING user_id`,
        [email, firstName, lastName, residence, passwordHash, role]
      );
      return rows[0].user_id;
    };

    const adminId = await insertUser('admin@remotedays.app', 'Admin', 'User', 'LU', 'admin');
    const hrId = await insertUser('hr@remotedays.app', 'Helen', 'Reyes', 'LU', 'hr');
    const mainEmployeeId = await insertUser('employee@remotedays.app', 'John', 'Doe', 'FR', 'employee');

    // 4. Work calendar + employees.
    const workDays = generateWorkDays(year, now);
    const distribution: Record<string, number> = {};

    interface Employee {
      id: string;
      email: string;
      country: 'FR' | 'BE' | 'DE';
      bucket: BucketKey;
      threshold: number;
      homeDays: number;
    }

    const employees: Employee[] = [];
    let sequence = 0;

    for (const bucket of BUCKETS) {
      distribution[bucket.key] = bucket.count;
      for (let i = 0; i < bucket.count; i++) {
        sequence += 1;
        const firstName = pick(rng, FIRST_NAMES);
        const lastName = pick(rng, LAST_NAMES);
        const country = pickEmployeeCountry(rng, bucket.key);
        const threshold = THRESHOLDS[country];
        // Derive the home-day target from this employee's own allowance.
        const pct = randInt(rng, bucket.minPct, bucket.maxPct);
        const homeDays = Math.max(0, Math.min(Math.round((pct / 100) * threshold), workDays.length));

        const email = `${sanitize(firstName)}.${sanitize(lastName)}${sequence}@remotedays.app`;
        const id = await insertUser(email, firstName, lastName, country, 'employee');
        employees.push({ id, email, country, bucket: bucket.key, threshold, homeDays });
      }
    }

    // Main demo employee: a realistic "approaching limit" state (≈80% of 34 days).
    const mainEmployee = {
      id: mainEmployeeId,
      bucket: 'high' as BucketKey,
      country: 'FR' as const,
      threshold: THRESHOLDS.FR,
      homeDays: Math.round(0.8 * THRESHOLDS.FR),
    };

    // 5. Entries: one row per declared workday, per employee.
    const entryRows: Array<{ userId: string; date: string; status: string }> = [];
    const allEmployees = [...employees, mainEmployee];

    for (const emp of allEmployees) {
      const shuffled = shuffle(rng, workDays);
      const homeDates = shuffled.slice(0, emp.homeDays);
      const rest = shuffled.slice(emp.homeDays);

      const undeclaredCount = Math.round(rest.length * 0.06);
      const travelCount = Math.round(rest.length * 0.03);
      const sickCount = Math.round(rest.length * 0.02);
      // A few rows carry the enum's sentinel value: recorded, but with no
      // resolvable status. Exercises the "Unknown" badge and HR override path.
      const unknownCount = Math.max(1, Math.round(rest.length * 0.01));

      const travelDates = rest.slice(0, travelCount);
      const sickDates = rest.slice(travelCount, travelCount + sickCount);
      const unknownDates = rest.slice(travelCount + sickCount, travelCount + sickCount + unknownCount);
      // The next `undeclaredCount` dates intentionally get no entry at all.
      const officeDates = rest.slice(travelCount + sickCount + unknownCount + undeclaredCount);

      for (const date of homeDates) entryRows.push({ userId: emp.id, date, status: 'home' });
      for (const date of travelDates) entryRows.push({ userId: emp.id, date, status: 'travel' });
      for (const date of sickDates) entryRows.push({ userId: emp.id, date, status: 'sick' });
      for (const date of unknownDates) entryRows.push({ userId: emp.id, date, status: 'unknown' });
      for (const date of officeDates) entryRows.push({ userId: emp.id, date, status: 'office' });
    }

    await bulkInsertEntries(client, entryRows);
    log(`  ${allEmployees.length} employees, ${entryRows.length} entries for ${year}`);

    // 6. Correction requests.
    const workDayCount = workDays.length;
    const requestDates = () => workDays[Math.max(0, workDayCount - 1 - randInt(rng, 0, Math.min(60, workDayCount - 1)))];
    const pickEmployee = () => pick(rng, employees);

    let requests = 0;
    for (let i = 0; i < 6; i++) {
      const emp = pickEmployee();
      await client.query(
        `INSERT INTO requests (user_id, date, requested_status, reason, status) VALUES ($1, $2, 'home', $3, 'pending')`,
        [emp.id, requestDates(), pick(rng, REQUEST_REASONS)]
      );
      requests += 1;
    }
    for (let i = 0; i < 8; i++) {
      const emp = pickEmployee();
      await client.query(
        `INSERT INTO requests (user_id, date, requested_status, reason, status, admin_id, admin_note)
         VALUES ($1, $2, $3, $4, 'approved', $5, 'Approved - valid reason provided')`,
        [emp.id, requestDates(), pick(rng, ['home', 'office']), pick(rng, REQUEST_REASONS), hrId]
      );
      requests += 1;
    }
    for (let i = 0; i < 3; i++) {
      const emp = pickEmployee();
      await client.query(
        `INSERT INTO requests (user_id, date, requested_status, reason, status, admin_id, admin_note)
         VALUES ($1, $2, 'home', $3, 'rejected', $4, 'Rejected - insufficient justification')`,
        [emp.id, requestDates(), pick(rng, REQUEST_REASONS), hrId]
      );
      requests += 1;
    }
    await client.query(
      `INSERT INTO requests (user_id, date, requested_status, reason, status)
       VALUES ($1, $2, 'home', 'I forgot to declare this day as home office', 'pending')`,
      [mainEmployeeId, requestDates()]
    );
    requests += 1;

    // 7. Login attempts + security events (reference real accounts).
    const allUsers: Array<{ id: string; email: string }> = [
      { id: adminId, email: 'admin@remotedays.app' },
      { id: hrId, email: 'hr@remotedays.app' },
      { id: mainEmployeeId, email: 'employee@remotedays.app' },
      ...employees.map((emp) => ({ id: emp.id, email: emp.email })),
    ];

    let loginAttempts = 0;
    const activeLogins = allUsers.slice(0, 30);
    for (const user of activeLogins) {
      for (let day = 0; day < 14; day++) {
        const perDay = randInt(rng, 1, 2);
        for (let n = 0; n < perDay; n++) {
          await client.query(
            `INSERT INTO login_attempts (email, ip_address, user_agent, success, created_at) VALUES ($1, $2, $3, true, $4)`,
            [user.email, pick(rng, IP_ADDRESSES), pick(rng, USER_AGENTS), toTimestamp(randomTimestampWithinDays(rng, day + 1))]
          );
          loginAttempts += 1;
        }
      }
    }
    const failureReasons = ['Invalid password', 'Account not found', 'Account locked', 'Invalid email format'];
    for (let i = 0; i < 40; i++) {
      const email = rng() > 0.5 ? pick(rng, allUsers).email : `typo${randInt(rng, 1, 100)}@remotedays.app`;
      await client.query(
        `INSERT INTO login_attempts (email, ip_address, user_agent, success, failure_reason, created_at)
         VALUES ($1, $2, $3, false, $4, $5)`,
        [email, pick(rng, IP_ADDRESSES), pick(rng, USER_AGENTS), pick(rng, failureReasons), toTimestamp(randomTimestampWithinDays(rng, 14))]
      );
      loginAttempts += 1;
    }

    let securityEvents = 0;
    const securityEvent = async (
      type: string,
      user: { id: string; email: string } | null,
      details: Record<string, unknown>
    ) => {
      await client.query(
        `INSERT INTO security_events (event_type, user_id, email, ip_address, user_agent, details, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          type,
          user?.id ?? null,
          user?.email ?? null,
          pick(rng, IP_ADDRESSES),
          pick(rng, USER_AGENTS),
          JSON.stringify(details),
          toTimestamp(randomTimestampWithinDays(rng, 14)),
        ]
      );
      securityEvents += 1;
    };

    for (const user of allUsers.slice(0, 30)) {
      const count = randInt(rng, 3, 8);
      for (let i = 0; i < count; i++) await securityEvent('login_success', user, { method: 'password', mfa: false });
    }
    for (let i = 0; i < 25; i++) await securityEvent('login_failure', pick(rng, allUsers), { reason: 'invalid_password' });
    for (let i = 0; i < 5; i++) await securityEvent('password_reset_request', pick(rng, allUsers), { initiated_by: 'user' });
    for (let i = 0; i < 8; i++) {
      await securityEvent('data_export', rng() > 0.5 ? { id: adminId, email: 'admin@remotedays.app' } : { id: hrId, email: 'hr@remotedays.app' }, {
        export_type: pick(rng, ['csv', 'pdf', 'excel']),
        records: randInt(rng, 50, 500),
      });
    }

    // 8. Notifications (last 14 days, weekdays only for daily prompts).
    let notifications = 0;
    for (let day = 0; day < 14; day++) {
      const promptDate = new Date(Date.now() - day * 24 * 60 * 60 * 1000);
      if (isWeekend(promptDate)) continue;
      promptDate.setHours(8, 0, 0, 0);
      for (const user of allUsers.slice(0, 40)) {
        await client.query(
          `INSERT INTO notifications (user_id, channel, notification_type, payload, sent_at) VALUES ($1, $2, $3, $4, $5)`,
          [
            user.id,
            pick(rng, ['email', 'push']),
            'daily_prompt',
            JSON.stringify({ date: iso(promptDate), cta_token: `token_${randInt(rng, 100000, 999999)}` }),
            toTimestamp(promptDate),
          ]
        );
        notifications += 1;
      }
    }
    for (const emp of allEmployees.filter((e) => e.bucket === 'critical' || e.bucket === 'exceeded')) {
      await client.query(
        `INSERT INTO notifications (user_id, channel, notification_type, payload, sent_at) VALUES ($1, 'email', $2, $3, $4)`,
        [
          emp.id,
          emp.bucket === 'exceeded' ? 'breach' : pick(rng, ['warning_75', 'warning_90']),
          JSON.stringify({ threshold: emp.threshold, current_days: emp.homeDays, country: emp.country }),
          toTimestamp(randomTimestampWithinDays(rng, 14)),
        ]
      );
      notifications += 1;
    }

    // 9. Push tokens + logs (mobile subset).
    let pushTokens = 0;
    const mobileEmployees = employees.slice(0, 30);
    for (const emp of mobileEmployees) {
      await client.query(
        `INSERT INTO push_tokens (user_id, token, platform, device_name, is_active, created_at) VALUES ($1, $2, $3, $4, true, $5)`,
        [emp.id, `ExponentPushToken[${randInt(rng, 100000, 999999)}${randInt(rng, 100000, 999999)}]`, rng() > 0.5 ? 'ios' : 'android', pick(rng, DEVICE_NAMES), toTimestamp(randomTimestampWithinDays(rng, 30))]
      );
      pushTokens += 1;
    }
    for (const account of [{ id: adminId, name: 'iPhone 15 Pro Max' }, { id: hrId, name: 'iPhone 14 Pro' }]) {
      await client.query(
        `INSERT INTO push_tokens (user_id, token, platform, device_name, is_active, created_at) VALUES ($1, $2, 'ios', $3, true, $4)`,
        [account.id, `ExponentPushToken[${randInt(rng, 100000, 999999)}${randInt(rng, 100000, 999999)}]`, account.name, toTimestamp(randomTimestampWithinDays(rng, 30))]
      );
      pushTokens += 1;
    }

    let pushLogs = 0;
    for (const emp of mobileEmployees) {
      for (let day = 0; day < 14; day++) {
        const reminderDate = new Date(Date.now() - day * 24 * 60 * 60 * 1000);
        if (isWeekend(reminderDate)) continue;
        reminderDate.setHours(8, 0, 0, 0);
        const failed = rng() > 0.95;
        await client.query(
          `INSERT INTO push_notification_logs (user_id, notification_type, title, body, data, status, error_message, sent_at, created_at)
           VALUES ($1, 'daily_reminder', $2, $3, $4, $5, $6, $7, $7)`,
          [
            emp.id,
            'Where are you today?',
            'Tap to declare your work location for today.',
            JSON.stringify({ date: iso(reminderDate), action: 'declare' }),
            failed ? 'failed' : 'sent',
            failed ? 'Device not reachable' : null,
            toTimestamp(reminderDate),
          ]
        );
        pushLogs += 1;
      }
    }

    // 10. Audit logs (entry inserts already generate CREATE rows via trigger).
    const { rows: sampleEntries } = await client.query<{ id: string; status: string }>(
      `SELECT id, status FROM entries ORDER BY RANDOM() LIMIT 25`
    );
    let auditLogs = 0;
    for (const entry of sampleEntries) {
      await client.query(
        `INSERT INTO audit_logs (entry_id, actor_user_id, action, previous_status, new_status, reason, details, created_at)
         VALUES ($1, $2, 'OVERRIDE', $3, $4, $5, $6, $7)`,
        [
          entry.id,
          hrId,
          entry.status,
          pick(rng, ['home', 'office']),
          pick(rng, OVERRIDE_REASONS),
          JSON.stringify({ source: 'hr_correction', approved_by: 'hr@remotedays.app' }),
          toTimestamp(randomTimestampWithinDays(rng, 14)),
        ]
      );
      auditLogs += 1;
    }
    for (let i = 0; i < 10; i++) {
      await client.query(
        `INSERT INTO audit_logs (entry_id, actor_user_id, action, previous_status, new_status, reason, details, created_at)
         VALUES (NULL, NULL, 'SYSTEM', NULL, NULL, 'Daily compliance check completed', $1, $2)`,
        [JSON.stringify({ users_checked: allUsers.length, warnings_sent: randInt(rng, 5, 15) }), toTimestamp(randomTimestampWithinDays(rng, 14))]
      );
      auditLogs += 1;
    }

    await client.query('COMMIT');

    const summary: SeedSummary = {
      year,
      users: allUsers.length,
      employees: allEmployees.length,
      entries: entryRows.length,
      holidays: holidays.length,
      requests,
      notifications,
      pushTokens,
      pushLogs,
      loginAttempts,
      securityEvents,
      auditLogs,
      distribution,
    };
    log(
      `  done — ${summary.employees} employees, ${summary.entries} entries; buckets ${Object.entries(summary.distribution)
        .map(([k, v]) => `${k}:${v}`)
        .join(', ')}`
    );
    return summary;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
