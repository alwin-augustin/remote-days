import * as bcrypt from 'bcrypt';
import db from '../db';
import * as dotenv from 'dotenv';
import fastify from 'fastify';
import { format, subDays, subHours, isWeekend, eachDayOfInterval, startOfYear, addHours } from 'date-fns';

dotenv.config({ path: '../../.env' });

const dbUrl = process.env.DATABASE_URL;
console.log('Demo Seed Script using DATABASE_URL:', dbUrl);

// Demo data configuration
const DEMO_PASSWORD = 'password123';
const SALT_ROUNDS = 10;

// Compliance thresholds (34 days for FR/BE/DE)
const THRESHOLD = 34;

// Distribution of 100 employees by compliance status
const COMPLIANCE_DISTRIBUTION = {
  safe: 40, // 0-25 remote days (< 75%)
  warning: 30, // 26-30 remote days (75-90%)
  critical: 20, // 31-34 remote days (90-100%)
  exceeded: 10, // 35+ remote days (> 100%)
};

// Remote day ranges for each status
const REMOTE_DAY_RANGES = {
  safe: { min: 5, max: 25 },
  warning: { min: 26, max: 30 },
  critical: { min: 31, max: 34 },
  exceeded: { min: 35, max: 45 },
};

// Countries for employees
const COUNTRIES = ['FR', 'BE', 'DE'];

// First names and last names for generating employees
const FIRST_NAMES = [
  'Emma',
  'Louis',
  'Chloé',
  'Lucas',
  'Léa',
  'Hugo',
  'Manon',
  'Gabriel',
  'Inès',
  'Raphaël',
  'Camille',
  'Arthur',
  'Sarah',
  'Jules',
  'Jade',
  'Adam',
  'Louise',
  'Léo',
  'Alice',
  'Nathan',
  'Lina',
  'Tom',
  'Eva',
  'Mathis',
  'Anna',
  'Enzo',
  'Zoé',
  'Noah',
  'Clara',
  'Théo',
  'Charlotte',
  'Maxime',
  'Marie',
  'Alexandre',
  'Juliette',
  'Paul',
  'Lucie',
  'Ethan',
  'Rose',
  'Victor',
  'Sophie',
  'Antoine',
  'Margot',
  'Clément',
  'Ambre',
  'Benjamin',
  'Romane',
  'Quentin',
  'Océane',
  'Simon',
];

const LAST_NAMES = [
  'Martin',
  'Bernard',
  'Dubois',
  'Thomas',
  'Robert',
  'Richard',
  'Petit',
  'Durand',
  'Leroy',
  'Moreau',
  'Simon',
  'Laurent',
  'Lefebvre',
  'Michel',
  'Garcia',
  'David',
  'Bertrand',
  'Roux',
  'Vincent',
  'Fournier',
  'Morel',
  'Girard',
  'André',
  'Lefevre',
  'Mercier',
  'Dupont',
  'Lambert',
  'Bonnet',
  'François',
  'Martinez',
  'Müller',
  'Schmidt',
  'Schneider',
  'Fischer',
  'Weber',
  'Meyer',
  'Wagner',
  'Becker',
  'Schulz',
  'Hoffmann',
  'Peeters',
  'Janssens',
  'Maes',
  'Jacobs',
  'Willems',
  'Claes',
  'Goossens',
  'Wouters',
  'De Smedt',
  'Hermans',
];

// Request reasons
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

// IP addresses for security events and login attempts
const IP_ADDRESSES = [
  '192.168.1.100',
  '192.168.1.101',
  '10.0.0.50',
  '10.0.0.51',
  '172.16.0.10',
  '172.16.0.11',
  '82.165.120.45',
  '91.121.85.33',
  '213.186.33.5',
  '176.31.254.23',
  '51.255.68.100',
  '37.59.42.88',
  '185.234.219.50',
  '195.154.161.11',
  '78.193.78.21',
  '80.67.169.12',
];

// User agents for security events
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

// Notification types
const NOTIFICATION_TYPES = [
  'daily_prompt',
  'warning_75',
  'warning_90',
  'breach',
  'request_approved',
  'request_rejected',
];

// Security event types
const SECURITY_EVENT_TYPES = [
  'login_success',
  'login_failure',
  'password_reset_request',
  'password_reset_complete',
  'data_export',
  'session_created',
  'session_expired',
  'account_locked',
  'account_unlocked',
];

// Push notification types
const PUSH_NOTIFICATION_TYPES = [
  'daily_reminder',
  'request_approved',
  'request_rejected',
  'threshold_warning',
  'threshold_breach',
];

// Device names for push tokens
const DEVICE_NAMES = ['iPhone 15 Pro', 'iPhone 14', 'Pixel 8 Pro', 'Samsung Galaxy S24', 'iPad Pro', 'MacBook Pro'];

// Audit log reasons for HR overrides
const OVERRIDE_REASONS = [
  'Employee requested correction via email',
  'Data entry error identified by HR',
  'Manager confirmed incorrect declaration',
  'Compliance audit correction',
  'System sync issue resolved',
  'Employee on approved leave - auto-corrected',
];

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomTimestampWithinDays(daysBack: number): Date {
  const now = new Date();
  const msBack = daysBack * 24 * 60 * 60 * 1000;
  const randomMs = Math.floor(Math.random() * msBack);
  return new Date(now.getTime() - randomMs);
}

function formatTimestamp(date: Date): string {
  return date.toISOString();
}

function generateWorkDays(year: number): string[] {
  const start = startOfYear(new Date(year, 0, 1));
  const today = new Date();
  const end = today < new Date(year, 11, 31) ? today : new Date(year, 11, 31);

  const allDays = eachDayOfInterval({ start, end });
  return allDays.filter((day) => !isWeekend(day)).map((day) => format(day, 'yyyy-MM-dd'));
}

async function seedDemoData() {
  const server = fastify();
  await server.register(db);
  await server.ready();

  const client = await server.pg.connect();

  try {
    console.log('=== Starting Demo Data Seed ===\n');
    await client.query('BEGIN');

    // 1. Clean all existing data
    console.log('1. Cleaning existing data...');
    await client.query('TRUNCATE TABLE push_notification_logs CASCADE;');
    await client.query('TRUNCATE TABLE push_tokens CASCADE;');
    await client.query('TRUNCATE TABLE security_events CASCADE;');
    await client.query('TRUNCATE TABLE login_attempts CASCADE;');
    await client.query('TRUNCATE TABLE requests CASCADE;');
    await client.query('TRUNCATE TABLE notifications CASCADE;');
    await client.query('TRUNCATE TABLE audit_logs CASCADE;');
    await client.query('TRUNCATE TABLE email_cta_tokens CASCADE;');
    await client.query('TRUNCATE TABLE entries CASCADE;');
    await client.query('TRUNCATE TABLE users CASCADE;');
    await client.query('TRUNCATE TABLE holidays CASCADE;');
    console.log('   ✓ All tables cleaned\n');

    // 2. Hash password
    console.log('2. Preparing password hash...');
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, SALT_ROUNDS);
    console.log(`   ✓ Password hash created for: ${DEMO_PASSWORD}\n`);

    // 3. Create main accounts
    console.log('3. Creating main accounts...');

    const adminResult = await client.query(
      `INSERT INTO users (email, first_name, last_name, country_of_residence, work_country, password_hash, role, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true) RETURNING user_id`,
      ['admin@remotedays.app', 'Admin', 'User', 'LU', 'LU', passwordHash, 'admin']
    );
    const adminId = adminResult.rows[0].user_id;
    console.log(`   ✓ Admin: admin@remotedays.app (${adminId})`);

    const hrResult = await client.query(
      `INSERT INTO users (email, first_name, last_name, country_of_residence, work_country, password_hash, role, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true) RETURNING user_id`,
      ['hr@remotedays.app', 'HR', 'Manager', 'LU', 'LU', passwordHash, 'hr']
    );
    const hrId = hrResult.rows[0].user_id;
    console.log(`   ✓ HR: hr@remotedays.app (${hrId})`);

    const employeeResult = await client.query(
      `INSERT INTO users (email, first_name, last_name, country_of_residence, work_country, password_hash, role, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true) RETURNING user_id`,
      ['employee@remotedays.app', 'John', 'Doe', 'FR', 'LU', passwordHash, 'employee']
    );
    const mainEmployeeId = employeeResult.rows[0].user_id;
    console.log(`   ✓ Employee: employee@remotedays.app (${mainEmployeeId})\n`);

    // 4. Create 100 additional employees
    console.log('4. Creating 100 additional employees...');
    const employeeIds: { id: string; status: string; country: string }[] = [];
    let employeeCount = 0;

    for (const [status, count] of Object.entries(COMPLIANCE_DISTRIBUTION)) {
      for (let i = 0; i < count; i++) {
        employeeCount++;
        const firstName = getRandomElement(FIRST_NAMES);
        const lastName = getRandomElement(LAST_NAMES);
        const country = getRandomElement(COUNTRIES);
        const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${employeeCount}@remotedays.app`;

        const result = await client.query(
          `INSERT INTO users (email, first_name, last_name, country_of_residence, work_country, password_hash, role, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, true) RETURNING user_id`,
          [email, firstName, lastName, country, 'LU', passwordHash, 'employee']
        );

        employeeIds.push({
          id: result.rows[0].user_id,
          status,
          country,
        });
      }
    }
    console.log(`   ✓ Created ${employeeCount} employees`);
    console.log(`     - Safe (0-25 days): ${COMPLIANCE_DISTRIBUTION.safe}`);
    console.log(`     - Warning (26-30 days): ${COMPLIANCE_DISTRIBUTION.warning}`);
    console.log(`     - Critical (31-34 days): ${COMPLIANCE_DISTRIBUTION.critical}`);
    console.log(`     - Exceeded (35+ days): ${COMPLIANCE_DISTRIBUTION.exceeded}\n`);

    // 5. Generate work entries for 2025
    console.log('5. Generating work entries for 2025...');
    const workDays = generateWorkDays(2025);
    console.log(`   Found ${workDays.length} work days in 2025`);

    let totalEntries = 0;

    // Entries for main employee (warning status - 28 remote days)
    const mainEmployeeRemoteDays = 28;
    const mainEmployeeHomeDays = workDays.slice(0, mainEmployeeRemoteDays);
    const mainEmployeeOfficeDays = workDays.slice(mainEmployeeRemoteDays);

    for (const day of mainEmployeeHomeDays) {
      await client.query(`INSERT INTO entries (user_id, date, status, source) VALUES ($1, $2, 'home', 'seed')`, [
        mainEmployeeId,
        day,
      ]);
      totalEntries++;
    }
    for (const day of mainEmployeeOfficeDays) {
      await client.query(`INSERT INTO entries (user_id, date, status, source) VALUES ($1, $2, 'office', 'seed')`, [
        mainEmployeeId,
        day,
      ]);
      totalEntries++;
    }
    console.log(`   ✓ Main employee: ${mainEmployeeRemoteDays} home + ${mainEmployeeOfficeDays.length} office days`);

    // Entries for 100 additional employees
    for (const emp of employeeIds) {
      const range = REMOTE_DAY_RANGES[emp.status as keyof typeof REMOTE_DAY_RANGES];
      const remoteDays = getRandomInt(range.min, range.max);

      // Randomly select which days are remote
      const shuffledDays = [...workDays].sort(() => Math.random() - 0.5);
      const homeDays = shuffledDays.slice(0, Math.min(remoteDays, workDays.length));
      const officeDays = shuffledDays.slice(Math.min(remoteDays, workDays.length));

      for (const day of homeDays) {
        await client.query(`INSERT INTO entries (user_id, date, status, source) VALUES ($1, $2, 'home', 'seed')`, [
          emp.id,
          day,
        ]);
        totalEntries++;
      }
      for (const day of officeDays) {
        await client.query(`INSERT INTO entries (user_id, date, status, source) VALUES ($1, $2, 'office', 'seed')`, [
          emp.id,
          day,
        ]);
        totalEntries++;
      }
    }
    console.log(`   ✓ Total entries created: ${totalEntries}\n`);

    // 6. Create requests with various statuses
    console.log('6. Creating modification requests...');

    // Pending requests (5)
    for (let i = 0; i < 5; i++) {
      const emp = getRandomElement(employeeIds);
      const randomDay = getRandomElement(workDays.slice(-30)); // Last 30 days
      await client.query(
        `INSERT INTO requests (user_id, date, requested_status, reason, status)
         VALUES ($1, $2, 'home', $3, 'pending')`,
        [emp.id, randomDay, getRandomElement(REQUEST_REASONS)]
      );
    }
    console.log('   ✓ 5 pending requests');

    // Approved requests (8)
    for (let i = 0; i < 8; i++) {
      const emp = getRandomElement(employeeIds);
      const randomDay = getRandomElement(workDays.slice(-60, -30)); // 30-60 days ago
      await client.query(
        `INSERT INTO requests (user_id, date, requested_status, reason, status, admin_id, admin_note)
         VALUES ($1, $2, $3, $4, 'approved', $5, $6)`,
        [
          emp.id,
          randomDay,
          getRandomElement(['home', 'office']),
          getRandomElement(REQUEST_REASONS),
          hrId,
          'Approved - valid reason provided',
        ]
      );
    }
    console.log('   ✓ 8 approved requests');

    // Rejected requests (3)
    for (let i = 0; i < 3; i++) {
      const emp = getRandomElement(employeeIds);
      const randomDay = getRandomElement(workDays.slice(-60, -30));
      await client.query(
        `INSERT INTO requests (user_id, date, requested_status, reason, status, admin_id, admin_note)
         VALUES ($1, $2, 'home', $3, 'rejected', $4, $5)`,
        [emp.id, randomDay, getRandomElement(REQUEST_REASONS), hrId, 'Rejected - insufficient justification']
      );
    }
    console.log('   ✓ 3 rejected requests');

    // Request from main employee (pending)
    await client.query(
      `INSERT INTO requests (user_id, date, requested_status, reason, status)
       VALUES ($1, $2, 'home', $3, 'pending')`,
      [mainEmployeeId, workDays[workDays.length - 5], 'I forgot to declare this day as home office']
    );
    console.log('   ✓ 1 pending request for main employee\n');

    // 7. Add holidays for 2025
    console.log('7. Adding 2025 holidays...');
    const holidays = [
      // Luxembourg (company HQ)
      { date: '2025-01-01', country: 'LU', description: "New Year's Day" },
      { date: '2025-04-21', country: 'LU', description: 'Easter Monday' },
      { date: '2025-05-01', country: 'LU', description: 'Labour Day' },
      { date: '2025-05-09', country: 'LU', description: 'Europe Day' },
      { date: '2025-05-29', country: 'LU', description: 'Ascension Day' },
      { date: '2025-06-09', country: 'LU', description: 'Whit Monday' },
      { date: '2025-06-23', country: 'LU', description: 'National Day' },
      { date: '2025-08-15', country: 'LU', description: 'Assumption Day' },
      { date: '2025-11-01', country: 'LU', description: "All Saints' Day" },
      { date: '2025-12-25', country: 'LU', description: 'Christmas Day' },
      { date: '2025-12-26', country: 'LU', description: "St. Stephen's Day" },

      // France
      { date: '2025-01-01', country: 'FR', description: "New Year's Day" },
      { date: '2025-04-21', country: 'FR', description: 'Easter Monday' },
      { date: '2025-05-01', country: 'FR', description: 'Labour Day' },
      { date: '2025-05-08', country: 'FR', description: 'Victory in Europe Day' },
      { date: '2025-05-29', country: 'FR', description: 'Ascension Day' },
      { date: '2025-06-09', country: 'FR', description: 'Whit Monday' },
      { date: '2025-07-14', country: 'FR', description: 'Bastille Day' },
      { date: '2025-08-15', country: 'FR', description: 'Assumption Day' },
      { date: '2025-11-01', country: 'FR', description: "All Saints' Day" },
      { date: '2025-11-11', country: 'FR', description: 'Armistice Day' },
      { date: '2025-12-25', country: 'FR', description: 'Christmas Day' },

      // Belgium
      { date: '2025-01-01', country: 'BE', description: "New Year's Day" },
      { date: '2025-04-21', country: 'BE', description: 'Easter Monday' },
      { date: '2025-05-01', country: 'BE', description: 'Labour Day' },
      { date: '2025-05-29', country: 'BE', description: 'Ascension Day' },
      { date: '2025-06-09', country: 'BE', description: 'Whit Monday' },
      { date: '2025-07-21', country: 'BE', description: 'Belgian National Day' },
      { date: '2025-08-15', country: 'BE', description: 'Assumption Day' },
      { date: '2025-11-01', country: 'BE', description: "All Saints' Day" },
      { date: '2025-11-11', country: 'BE', description: 'Armistice Day' },
      { date: '2025-12-25', country: 'BE', description: 'Christmas Day' },

      // Germany
      { date: '2025-01-01', country: 'DE', description: "New Year's Day" },
      { date: '2025-04-18', country: 'DE', description: 'Good Friday' },
      { date: '2025-04-21', country: 'DE', description: 'Easter Monday' },
      { date: '2025-05-01', country: 'DE', description: 'Labour Day' },
      { date: '2025-05-29', country: 'DE', description: 'Ascension Day' },
      { date: '2025-06-09', country: 'DE', description: 'Whit Monday' },
      { date: '2025-10-03', country: 'DE', description: 'Day of German Unity' },
      { date: '2025-12-25', country: 'DE', description: 'Christmas Day' },
      { date: '2025-12-26', country: 'DE', description: 'Second Day of Christmas' },
    ];

    for (const holiday of holidays) {
      await client.query(
        `INSERT INTO holidays (date, country_code, description)
         VALUES ($1, $2, $3) ON CONFLICT (date, country_code) DO NOTHING`,
        [holiday.date, holiday.country, holiday.description]
      );
    }
    console.log(`   ✓ Added ${holidays.length} holidays\n`);

    // 8. Update country thresholds
    console.log('8. Setting country thresholds...');
    await client.query(
      `INSERT INTO country_thresholds (country_code, max_remote_days)
       VALUES ('FR', 34), ('BE', 34), ('DE', 34), ('LU', 999)
       ON CONFLICT (country_code) DO UPDATE SET max_remote_days = EXCLUDED.max_remote_days`
    );
    console.log('   ✓ FR: 34 days, BE: 34 days, DE: 34 days, LU: unlimited\n');

    // 9. Generate login attempts for last 2 weeks
    console.log('9. Generating login attempts (2 weeks)...');
    const allUsers = [
      { id: adminId, email: 'admin@remotedays.app' },
      { id: hrId, email: 'hr@remotedays.app' },
      { id: mainEmployeeId, email: 'employee@remotedays.app' },
      ...employeeIds.map((emp, i) => ({
        id: emp.id,
        email: `employee${i + 1}@remotedays.app`,
      })),
    ];

    let loginAttemptCount = 0;
    // Successful logins - each user logs in 1-3 times per day for 14 days
    for (const user of allUsers.slice(0, 50)) {
      // First 50 users have login activity
      const loginsPerDay = getRandomInt(1, 3);
      for (let day = 0; day < 14; day++) {
        for (let login = 0; login < loginsPerDay; login++) {
          const timestamp = getRandomTimestampWithinDays(day + 1);
          await client.query(
            `INSERT INTO login_attempts (email, ip_address, user_agent, success, created_at)
             VALUES ($1, $2, $3, true, $4)`,
            [user.email, getRandomElement(IP_ADDRESSES), getRandomElement(USER_AGENTS), formatTimestamp(timestamp)]
          );
          loginAttemptCount++;
        }
      }
    }

    // Failed login attempts (wrong password, typos, etc.)
    const failureReasons = ['Invalid password', 'Account not found', 'Account locked', 'Invalid email format'];
    for (let i = 0; i < 50; i++) {
      const timestamp = getRandomTimestampWithinDays(14);
      const email =
        Math.random() > 0.5 ? getRandomElement(allUsers).email : `typo${getRandomInt(1, 100)}@remotedays.app`;
      await client.query(
        `INSERT INTO login_attempts (email, ip_address, user_agent, success, failure_reason, created_at)
         VALUES ($1, $2, $3, false, $4, $5)`,
        [
          email,
          getRandomElement(IP_ADDRESSES),
          getRandomElement(USER_AGENTS),
          getRandomElement(failureReasons),
          formatTimestamp(timestamp),
        ]
      );
      loginAttemptCount++;
    }
    console.log(`   ✓ Created ${loginAttemptCount} login attempts\n`);

    // 10. Generate security events for last 2 weeks
    console.log('10. Generating security events (2 weeks)...');
    let securityEventCount = 0;

    // Login success events
    for (const user of allUsers.slice(0, 50)) {
      for (let i = 0; i < getRandomInt(5, 15); i++) {
        const timestamp = getRandomTimestampWithinDays(14);
        await client.query(
          `INSERT INTO security_events (event_type, user_id, email, ip_address, user_agent, details, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            'login_success',
            user.id,
            user.email,
            getRandomElement(IP_ADDRESSES),
            getRandomElement(USER_AGENTS),
            JSON.stringify({ method: 'password', mfa: false }),
            formatTimestamp(timestamp),
          ]
        );
        securityEventCount++;
      }
    }

    // Login failure events
    for (let i = 0; i < 30; i++) {
      const timestamp = getRandomTimestampWithinDays(14);
      const user = getRandomElement(allUsers);
      await client.query(
        `INSERT INTO security_events (event_type, user_id, email, ip_address, user_agent, details, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          'login_failure',
          user.id,
          user.email,
          getRandomElement(IP_ADDRESSES),
          getRandomElement(USER_AGENTS),
          JSON.stringify({ reason: 'invalid_password', attempts: getRandomInt(1, 3) }),
          formatTimestamp(timestamp),
        ]
      );
      securityEventCount++;
    }

    // Session created events
    for (const user of allUsers.slice(0, 30)) {
      for (let i = 0; i < getRandomInt(2, 5); i++) {
        const timestamp = getRandomTimestampWithinDays(14);
        await client.query(
          `INSERT INTO security_events (event_type, user_id, email, ip_address, user_agent, details, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            'session_created',
            user.id,
            user.email,
            getRandomElement(IP_ADDRESSES),
            getRandomElement(USER_AGENTS),
            JSON.stringify({ session_duration: '24h' }),
            formatTimestamp(timestamp),
          ]
        );
        securityEventCount++;
      }
    }

    // Password reset requests (a few)
    for (let i = 0; i < 5; i++) {
      const timestamp = getRandomTimestampWithinDays(14);
      const user = getRandomElement(allUsers);
      await client.query(
        `INSERT INTO security_events (event_type, user_id, email, ip_address, user_agent, details, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          'password_reset_request',
          user.id,
          user.email,
          getRandomElement(IP_ADDRESSES),
          getRandomElement(USER_AGENTS),
          JSON.stringify({ initiated_by: 'user' }),
          formatTimestamp(timestamp),
        ]
      );
      securityEventCount++;
    }

    // Data export events (HR/Admin only)
    for (let i = 0; i < 8; i++) {
      const timestamp = getRandomTimestampWithinDays(14);
      const adminUser =
        Math.random() > 0.5 ? { id: adminId, email: 'admin@remotedays.app' } : { id: hrId, email: 'hr@remotedays.app' };
      await client.query(
        `INSERT INTO security_events (event_type, user_id, email, ip_address, user_agent, details, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          'data_export',
          adminUser.id,
          adminUser.email,
          getRandomElement(IP_ADDRESSES),
          getRandomElement(USER_AGENTS),
          JSON.stringify({ export_type: getRandomElement(['csv', 'pdf', 'excel']), records: getRandomInt(50, 500) }),
          formatTimestamp(timestamp),
        ]
      );
      securityEventCount++;
    }

    // Account locked/unlocked events
    for (let i = 0; i < 3; i++) {
      const timestamp = getRandomTimestampWithinDays(14);
      const user = getRandomElement(allUsers.slice(3)); // Not admin/hr/main employee
      await client.query(
        `INSERT INTO security_events (event_type, user_id, email, ip_address, user_agent, details, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          'account_locked',
          user.id,
          user.email,
          getRandomElement(IP_ADDRESSES),
          getRandomElement(USER_AGENTS),
          JSON.stringify({ reason: 'too_many_failed_attempts', failed_attempts: 5 }),
          formatTimestamp(timestamp),
        ]
      );
      securityEventCount++;

      // Unlock 1 hour later
      const unlockTime = addHours(timestamp, 1);
      await client.query(
        `INSERT INTO security_events (event_type, user_id, email, ip_address, user_agent, details, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          'account_unlocked',
          user.id,
          user.email,
          getRandomElement(IP_ADDRESSES),
          getRandomElement(USER_AGENTS),
          JSON.stringify({ unlocked_by: 'system', reason: 'lockout_expired' }),
          formatTimestamp(unlockTime),
        ]
      );
      securityEventCount++;
    }
    console.log(`   ✓ Created ${securityEventCount} security events\n`);

    // 11. Generate notifications for last 2 weeks
    console.log('11. Generating notifications (2 weeks)...');
    let notificationCount = 0;

    // Daily prompts for all active users
    for (let day = 0; day < 14; day++) {
      const promptDate = subDays(new Date(), day);
      if (!isWeekend(promptDate)) {
        for (const user of allUsers.slice(0, 60)) {
          // 60 users get daily prompts
          const timestamp = new Date(promptDate);
          timestamp.setHours(8, 0, 0, 0); // 8 AM
          await client.query(
            `INSERT INTO notifications (user_id, channel, notification_type, payload, sent_at)
             VALUES ($1, $2, $3, $4, $5)`,
            [
              user.id,
              getRandomElement(['email', 'push']),
              'daily_prompt',
              JSON.stringify({
                date: format(promptDate, 'yyyy-MM-dd'),
                cta_token: 'token_' + Math.random().toString(36).substr(2, 9),
              }),
              formatTimestamp(timestamp),
            ]
          );
          notificationCount++;
        }
      }
    }

    // Warning notifications for critical/exceeded employees
    const criticalEmployees = employeeIds.filter((e) => e.status === 'critical' || e.status === 'exceeded');
    for (const emp of criticalEmployees) {
      const warningType = emp.status === 'exceeded' ? 'breach' : getRandomElement(['warning_75', 'warning_90']);
      const timestamp = getRandomTimestampWithinDays(14);
      await client.query(
        `INSERT INTO notifications (user_id, channel, notification_type, payload, sent_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          emp.id,
          'email',
          warningType,
          JSON.stringify({ threshold: 34, current_days: getRandomInt(30, 40), country: emp.country }),
          formatTimestamp(timestamp),
        ]
      );
      notificationCount++;
    }

    // Request approved/rejected notifications
    for (let i = 0; i < 15; i++) {
      const user = getRandomElement(employeeIds);
      const notifType = Math.random() > 0.3 ? 'request_approved' : 'request_rejected';
      const timestamp = getRandomTimestampWithinDays(14);
      await client.query(
        `INSERT INTO notifications (user_id, channel, notification_type, payload, sent_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          user.id,
          getRandomElement(['email', 'push']),
          notifType,
          JSON.stringify({
            request_date: format(subDays(new Date(), getRandomInt(1, 30)), 'yyyy-MM-dd'),
            admin_note: notifType === 'request_approved' ? 'Approved' : 'Insufficient justification',
          }),
          formatTimestamp(timestamp),
        ]
      );
      notificationCount++;
    }
    console.log(`   ✓ Created ${notificationCount} notifications\n`);

    // 12. Generate push tokens for mobile users (~30% of employees)
    console.log('12. Generating push tokens for mobile users...');
    let pushTokenCount = 0;
    const mobileUsers = employeeIds.slice(0, 30); // First 30 employees use mobile app

    for (const user of mobileUsers) {
      const platform = Math.random() > 0.5 ? 'ios' : 'android';
      const deviceName = getRandomElement(DEVICE_NAMES);
      await client.query(
        `INSERT INTO push_tokens (user_id, token, platform, device_name, is_active, created_at)
         VALUES ($1, $2, $3, $4, true, $5)`,
        [
          user.id,
          `ExponentPushToken[${Math.random().toString(36).substr(2, 22)}]`,
          platform,
          deviceName,
          formatTimestamp(subDays(new Date(), getRandomInt(7, 60))),
        ]
      );
      pushTokenCount++;
    }

    // Admin and HR also have mobile
    await client.query(
      `INSERT INTO push_tokens (user_id, token, platform, device_name, is_active, created_at)
       VALUES ($1, $2, 'ios', 'iPhone 15 Pro Max', true, $3)`,
      [
        adminId,
        `ExponentPushToken[${Math.random().toString(36).substr(2, 22)}]`,
        formatTimestamp(subDays(new Date(), 30)),
      ]
    );
    await client.query(
      `INSERT INTO push_tokens (user_id, token, platform, device_name, is_active, created_at)
       VALUES ($1, $2, 'ios', 'iPhone 14 Pro', true, $3)`,
      [hrId, `ExponentPushToken[${Math.random().toString(36).substr(2, 22)}]`, formatTimestamp(subDays(new Date(), 25))]
    );
    pushTokenCount += 2;
    console.log(`   ✓ Created ${pushTokenCount} push tokens\n`);

    // 13. Generate push notification logs for last 2 weeks
    console.log('13. Generating push notification logs (2 weeks)...');
    let pushLogCount = 0;

    for (const user of mobileUsers) {
      // Daily reminders
      for (let day = 0; day < 14; day++) {
        const reminderDate = subDays(new Date(), day);
        if (!isWeekend(reminderDate)) {
          const timestamp = new Date(reminderDate);
          timestamp.setHours(8, 0, 0, 0);
          const status = Math.random() > 0.95 ? 'failed' : 'sent';
          await client.query(
            `INSERT INTO push_notification_logs (user_id, notification_type, title, body, data, status, error_message, sent_at, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              user.id,
              'daily_reminder',
              '📍 Where are you today?',
              'Tap to declare your work location for today.',
              JSON.stringify({ date: format(reminderDate, 'yyyy-MM-dd'), action: 'declare' }),
              status,
              status === 'failed' ? 'Device not reachable' : null,
              status === 'sent' ? formatTimestamp(timestamp) : null,
              formatTimestamp(timestamp),
            ]
          );
          pushLogCount++;
        }
      }

      // Threshold warnings for critical users
      if (['critical', 'exceeded'].includes(user.status)) {
        const timestamp = getRandomTimestampWithinDays(14);
        const notifType = user.status === 'exceeded' ? 'threshold_breach' : 'threshold_warning';
        const title = user.status === 'exceeded' ? '⚠️ Threshold Exceeded!' : '⚠️ Approaching Threshold';
        await client.query(
          `INSERT INTO push_notification_logs (user_id, notification_type, title, body, data, status, sent_at, created_at)
           VALUES ($1, $2, $3, $4, $5, 'sent', $6, $7)`,
          [
            user.id,
            notifType,
            title,
            `You have used ${getRandomInt(30, 40)} of 34 remote days in ${user.country}.`,
            JSON.stringify({ country: user.country, threshold: 34 }),
            formatTimestamp(timestamp),
            formatTimestamp(timestamp),
          ]
        );
        pushLogCount++;
      }
    }

    // Request notifications
    for (let i = 0; i < 20; i++) {
      const user = getRandomElement(mobileUsers);
      const isApproved = Math.random() > 0.3;
      const timestamp = getRandomTimestampWithinDays(14);
      await client.query(
        `INSERT INTO push_notification_logs (user_id, notification_type, title, body, data, status, sent_at, created_at)
         VALUES ($1, $2, $3, $4, $5, 'sent', $6, $7)`,
        [
          user.id,
          isApproved ? 'request_approved' : 'request_rejected',
          isApproved ? '✅ Request Approved' : '❌ Request Rejected',
          isApproved ? 'Your change request has been approved by HR.' : 'Your change request was not approved.',
          JSON.stringify({ request_id: Math.random().toString(36).substr(2, 9) }),
          formatTimestamp(timestamp),
          formatTimestamp(timestamp),
        ]
      );
      pushLogCount++;
    }
    console.log(`   ✓ Created ${pushLogCount} push notification logs\n`);

    // 14. Generate additional audit logs (HR overrides)
    console.log('14. Generating audit logs (HR overrides)...');
    let auditLogCount = 0;

    // Get some entry IDs for audit logs
    const entryResult = await client.query(`SELECT id, user_id, status FROM entries ORDER BY RANDOM() LIMIT 20`);

    for (const entry of entryResult.rows) {
      const timestamp = getRandomTimestampWithinDays(14);
      const newStatus = entry.status === 'home' ? 'office' : 'home';
      await client.query(
        `INSERT INTO audit_logs (entry_id, actor_user_id, action, previous_status, new_status, reason, details, created_at)
         VALUES ($1, $2, 'OVERRIDE', $3, $4, $5, $6, $7)`,
        [
          entry.id,
          hrId,
          entry.status,
          newStatus,
          getRandomElement(OVERRIDE_REASONS),
          JSON.stringify({ source: 'hr_correction', approved_by: 'hr@remotedays.app' }),
          formatTimestamp(timestamp),
        ]
      );
      auditLogCount++;
    }

    // System audit logs
    for (let i = 0; i < 10; i++) {
      const timestamp = getRandomTimestampWithinDays(14);
      await client.query(
        `INSERT INTO audit_logs (entry_id, actor_user_id, action, previous_status, new_status, reason, details, created_at)
         VALUES (NULL, NULL, 'SYSTEM', NULL, NULL, $1, $2, $3)`,
        [
          'Daily compliance check completed',
          JSON.stringify({ users_checked: 103, warnings_sent: getRandomInt(5, 15) }),
          formatTimestamp(timestamp),
        ]
      );
      auditLogCount++;
    }
    console.log(`   ✓ Created ${auditLogCount} additional audit logs\n`);

    await client.query('COMMIT');

    // Summary
    console.log('=== Demo Data Seed Complete ===\n');
    console.log('Login Credentials:');
    console.log('┌─────────────────────────────────┬──────────────┐');
    console.log('│ Email                           │ Password     │');
    console.log('├─────────────────────────────────┼──────────────┤');
    console.log('│ admin@remotedays.app            │ password123  │');
    console.log('│ hr@remotedays.app               │ password123  │');
    console.log('│ employee@remotedays.app         │ password123  │');
    console.log('└─────────────────────────────────┴──────────────┘');
    console.log('\nEmployee Distribution (by compliance status):');
    console.log(`  • Safe (< 75%): ${COMPLIANCE_DISTRIBUTION.safe} employees`);
    console.log(`  • Warning (75-90%): ${COMPLIANCE_DISTRIBUTION.warning} employees`);
    console.log(`  • Critical (90-100%): ${COMPLIANCE_DISTRIBUTION.critical} employees`);
    console.log(`  • Exceeded (> 100%): ${COMPLIANCE_DISTRIBUTION.exceeded} employees`);
    console.log('\nData Summary:');
    console.log('  • 103 users (1 admin + 1 HR + 101 employees)');
    console.log(`  • ${totalEntries} work entries`);
    console.log(`  • ${loginAttemptCount} login attempts (2 weeks)`);
    console.log(`  • ${securityEventCount} security events (2 weeks)`);
    console.log(`  • ${notificationCount} notifications (2 weeks)`);
    console.log(`  • ${pushTokenCount} push tokens`);
    console.log(`  • ${pushLogCount} push notification logs (2 weeks)`);
    console.log(`  • ${auditLogCount} HR override audit logs`);
    console.log('  • 17 pending/approved/rejected requests');
    console.log(`  • ${holidays.length} holidays`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err);
    throw err;
  } finally {
    client.release();
    await server.pg.pool.end();
  }
}

seedDemoData().catch(console.error);
