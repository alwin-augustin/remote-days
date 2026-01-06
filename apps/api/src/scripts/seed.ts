import { faker } from '@faker-js/faker';
import * as bcrypt from 'bcrypt';
import db from '../db';
import * as dotenv from 'dotenv';
import fastify from 'fastify';
import { startOfWeek, endOfWeek, eachDayOfInterval, subMonths, addDays, isWeekend, format } from 'date-fns';

dotenv.config({ path: '../../.env' });
// Override with process.env if available (Docker priority)
const dbUrl = process.env.DATABASE_URL || process.env.DATABASE_URL;
console.log('Seed Script using DATABASE_URL:', dbUrl);

interface UserSeed {
  email: string;
  firstName: string;
  lastName: string;
  countryOfResidence: string;
  workCountry: string;
  role: 'employee' | 'hr' | 'admin';
  passwordHash: string;
}

interface EntrySeed {
  user_id: string;
  date: string;
  status: string;
  source: string;
}

interface NotificationSeed {
  user_id: string;
  channel: string;
  notification_type: string;
  payload: any;
  sent_at: string;
}

const BATCH_SIZE = 1000;

async function batchInsert(client: any, table: string, columns: string[], data: any[][]) {
  if (data.length === 0) return;

  // Split into chunks
  for (let i = 0; i < data.length; i += BATCH_SIZE) {
    const chunk = data.slice(i, i + BATCH_SIZE);
    const placeholders: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    chunk.forEach((row) => {
      const rowPlaceholders: string[] = [];
      row.forEach((val) => {
        rowPlaceholders.push(`$${paramIndex++}`);
        values.push(val);
      });
      placeholders.push(`(${rowPlaceholders.join(', ')})`);
    });

    const query = `
      INSERT INTO ${table} (${columns.join(', ')})
      VALUES ${placeholders.join(', ')}
      ON CONFLICT DO NOTHING
    `;

    await client.query(query, values);
    console.log(`Inserted ${chunk.length} rows into ${table}`);
  }
}

const seedFakeData = async () => {
  const server = fastify();
  await server.register(db);
  await server.ready();

  const client = await server.pg.connect();
  const saltRounds = 10; // Lower rounds for faster seeding

  try {
    console.log('Starting massive seed...');
    await client.query('BEGIN');

    // 1. Cleanup
    console.log('Cleaning tables...');
    await client.query('TRUNCATE TABLE notifications CASCADE;');
    await client.query('TRUNCATE TABLE audit_logs CASCADE;');
    await client.query('TRUNCATE TABLE email_cta_tokens CASCADE;');
    await client.query('TRUNCATE TABLE entries CASCADE;');
    await client.query('TRUNCATE TABLE users CASCADE;');

    // 2. Prepare common password
    const commonPasswordHash = await bcrypt.hash('password123', saltRounds);

    // 2.1 Seed Holidays
    console.log('Seeding holidays...');
    await client.query('TRUNCATE TABLE holidays CASCADE;');

    const holidays = [
      // France
      { date: '2025-01-01', country_code: 'FR', description: "New Year's Day" },
      { date: '2025-04-21', country_code: 'FR', description: 'Easter Monday' },
      { date: '2025-05-01', country_code: 'FR', description: 'Labour Day' },
      { date: '2025-05-08', country_code: 'FR', description: 'Victory in Europe Day' },
      { date: '2025-05-29', country_code: 'FR', description: 'Ascension Day' },
      { date: '2025-06-09', country_code: 'FR', description: 'Whit Monday' },
      { date: '2025-07-14', country_code: 'FR', description: 'Bastille Day' },
      { date: '2025-08-15', country_code: 'FR', description: 'Assumption Day' },
      { date: '2025-11-01', country_code: 'FR', description: "All Saints' Day" },
      { date: '2025-11-11', country_code: 'FR', description: 'Armistice Day' },
      { date: '2025-12-25', country_code: 'FR', description: 'Christmas Day' },

      // Germany
      { date: '2025-01-01', country_code: 'DE', description: "New Year's Day" },
      { date: '2025-04-18', country_code: 'DE', description: 'Good Friday' },
      { date: '2025-04-21', country_code: 'DE', description: 'Easter Monday' },
      { date: '2025-05-01', country_code: 'DE', description: 'Labour Day' },
      { date: '2025-05-29', country_code: 'DE', description: 'Ascension Day' },
      { date: '2025-06-09', country_code: 'DE', description: 'Whit Monday' },
      { date: '2025-10-03', country_code: 'DE', description: 'Day of German Unity' },
      { date: '2025-12-25', country_code: 'DE', description: 'Christmas Day' },
      { date: '2025-12-26', country_code: 'DE', description: 'Second Day of Christmas' },

      // Belgium
      { date: '2025-01-01', country_code: 'BE', description: "New Year's Day" },
      { date: '2025-04-21', country_code: 'BE', description: 'Easter Monday' },
      { date: '2025-05-01', country_code: 'BE', description: 'Labour Day' },
      { date: '2025-05-29', country_code: 'BE', description: 'Ascension Day' },
      { date: '2025-06-09', country_code: 'BE', description: 'Whit Monday' },
      { date: '2025-07-21', country_code: 'BE', description: 'Belgian National Day' },
      { date: '2025-08-15', country_code: 'BE', description: 'Assumption Day' },
      { date: '2025-11-01', country_code: 'BE', description: "All Saints' Day" },
      { date: '2025-11-11', country_code: 'BE', description: 'Armistice Day' },
      { date: '2025-12-25', country_code: 'BE', description: 'Christmas Day' },
    ];

    for (const holiday of holidays) {
      await client.query(
        'INSERT INTO holidays (date, country_code, description) VALUES ($1, $2, $3) ON CONFLICT (date, country_code) DO NOTHING',
        [holiday.date, holiday.country_code, holiday.description]
      );
    }

    // 3. Ensure Default Admin & HR
    console.log('Ensuring default accounts...');

    const upsertUser = async (email: string, role: string, first: string, last: string) => {
      const res = await client.query(
        `INSERT INTO users (email, first_name, last_name, country_of_residence, work_country, password_hash, role, is_active)
         VALUES ($1, $2, $3, 'FR', 'FR', $4, $5, true)
         ON CONFLICT (email) DO UPDATE SET role = $5, password_hash = $4 RETURNING user_id`,
        [email, first, last, commonPasswordHash, role]
      );
      return res.rows[0].user_id;
    };

    const adminId = await upsertUser('admin@example.com', 'admin', 'Super', 'Admin');
    const hrId = await upsertUser('hr@example.com', 'hr', 'Jane', 'HR');
    await upsertUser('employee@example.com', 'employee', 'John', 'Doe');

    // 4. Generate Users (5 HR, 495 Employees)
    console.log('Generating 500 users...');
    const users: UserSeed[] = [];

    // 4 additional HR + 1 default HR = 5 Total HR
    for (let i = 0; i < 4; i++) {
      users.push({
        email: faker.internet.email({ firstName: `hr_user_${i + 1}`, provider: 'tracker.com' }).toLowerCase(),
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        countryOfResidence: faker.helpers.arrayElement(['FR', 'BE', 'DE', 'ES']),
        workCountry: 'FR',
        role: 'hr',
        passwordHash: commonPasswordHash,
      });
    }

    // 499 Employees + 1 default Employee = 500 Total Employees
    for (let i = 0; i < 499; i++) {
      users.push({
        email: faker.internet.email({ provider: 'tracker.com' }).toLowerCase(),
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        countryOfResidence: faker.helpers.arrayElement(['FR', 'BE', 'DE', 'ES']),
        workCountry: 'FR',
        role: 'employee',
        passwordHash: commonPasswordHash,
      });
    }

    // Insert Users
    // We need to insert and get IDs back. Batch insert complicates returning IDs mapped to roles.
    // So we'll just insert them and then select them back.
    const userValues = users.map((u) => [
      u.email,
      u.firstName,
      u.lastName,
      u.countryOfResidence,
      u.workCountry,
      u.role,
      u.passwordHash,
      true,
    ]);
    await batchInsert(
      client,
      'users',
      [
        'email',
        'first_name',
        'last_name',
        'country_of_residence',
        'work_country',
        'role',
        'password_hash',
        'is_active',
      ],
      userValues
    );

    // Fetch all user IDs
    const allUsersRes = await client.query('SELECT user_id, role FROM users');
    const allUsers = allUsersRes.rows;

    // 5. Generate Entries
    console.log('Generating entries for current week and history...');
    const entries: EntrySeed[] = [];
    const today = new Date();
    const threeMonthsAgo = subMonths(today, 3);
    const nextWeekEnd = addDays(today, 7); // Generate a bit into future

    const dateRange = eachDayOfInterval({ start: threeMonthsAgo, end: nextWeekEnd });
    const statuses = ['home', 'office', 'travel', 'sick'];

    for (const user of allUsers) {
      for (const date of dateRange) {
        if (isWeekend(date)) continue;

        // 80% chance to have an entry
        if (Math.random() > 0.2) {
          const status = faker.helpers.arrayElement(statuses);
          entries.push({
            user_id: user.user_id,
            date: format(date, 'yyyy-MM-dd'),
            status: status,
            source: 'seed',
          });
        }
      }
    }

    // Insert Entries
    const entryValues = entries.map((e) => [e.user_id, e.date, e.status, e.source]);
    await batchInsert(client, 'entries', ['user_id', 'date', 'status', 'source'], entryValues);

    // 6. Generate Notifications
    console.log('Generating notifications...');
    const notifications: NotificationSeed[] = [];
    const notificationTypes = ['daily_prompt', 'warning_75', 'breach'];

    for (const user of allUsers) {
      // Add a few notifications per user
      if (Math.random() > 0.7) {
        notifications.push({
          user_id: user.user_id,
          channel: 'email',
          notification_type: faker.helpers.arrayElement(notificationTypes),
          payload: JSON.stringify({ message: 'Please check your status.' }),
          sent_at: new Date().toISOString(),
        });
      }
    }

    const notifValues = notifications.map((n) => [n.user_id, n.channel, n.notification_type, n.payload, n.sent_at]);
    await batchInsert(
      client,
      'notifications',
      ['user_id', 'channel', 'notification_type', 'payload', 'sent_at'],
      notifValues
    );

    await client.query('COMMIT');
    console.log('Seed completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err);
  } finally {
    client.release();
    server.pg.pool.end();
  }
};

seedFakeData();
