import { faker } from '@faker-js/faker';
import * as bcrypt from 'bcrypt';
import db from '../db';
import * as dotenv from 'dotenv';
import fastify from 'fastify';
import { format, subDays, isWeekend, startOfYear } from 'date-fns';
import path from 'path';

// Load env from root
dotenv.config({ path: path.join(__dirname, '../../../../.env') });

const seedCustomDemo = async () => {
  const server = fastify();
  await server.register(db);
  await server.ready();

  const client = await server.pg.connect();
  const saltRounds = 10;

  try {
    console.log('Starting Custom Demo Seeding...');
    await client.query('BEGIN');

    // 1. Set Switzerland (CH) to 100 days for easy math
    console.log('Setting CH threshold to 100 days...');
    await client.query(`
            INSERT INTO country_thresholds (country_code, max_remote_days)
            VALUES ('CH', 100)
            ON CONFLICT (country_code) 
            DO UPDATE SET max_remote_days = EXCLUDED.max_remote_days;
        `);

    const passwordHash = await bcrypt.hash('password123', saltRounds);
    const currentYear = new Date().getFullYear();

    // Helper: Insert User
    const insertUser = async (email: string, first: string, last: string, country: string = 'CH') => {
      const res = await client.query(
        `INSERT INTO users (email, first_name, last_name, country_of_residence, work_country, password_hash, role, is_active)
                 VALUES ($1, $2, $3, $4, $4, $5, 'employee', true)
                 ON CONFLICT (email) 
                 DO UPDATE SET is_active = true, work_country = $4 RETURNING user_id`,
        [email, first, last, country, passwordHash]
      );
      return res.rows[0].user_id;
    };

    // Helper: Generate Dates (working backwards from today, skipping weekends)
    const getDates = (count: number): string[] => {
      const dates: string[] = [];
      let dayCursor = subDays(new Date(), 1); // Start yesterday

      while (dates.length < count) {
        // Ensure we don't go back before start of year (simplified)
        if (dayCursor.getFullYear() < currentYear) {
          console.warn(`Stopped generating dates: reached previous year at ${dayCursor}`);
          break;
        }

        if (!isWeekend(dayCursor)) {
          dates.push(format(dayCursor, 'yyyy-MM-dd'));
        }
        dayCursor = subDays(dayCursor, 1);
      }
      return dates;
    };

    // Helper: Insert Entries
    const insertEntries = async (userId: string, dates: string[]) => {
      if (dates.length === 0) return;

      // Batch insert for performance
      // We can't do single query with dynamic length easily in raw pg without generating string
      // Let's do a loop for simplicity as volume is low (<200 rows)
      for (const date of dates) {
        await client.query(
          `INSERT INTO entries (user_id, date, status, source)
                     VALUES ($1, $2, 'home', 'seed_demo')
                     ON CONFLICT (user_id, date) 
                     DO UPDATE SET status = 'home', source = 'seed_demo'`,
          [userId, date]
        );
      }
    };

    // ==========================================
    // 2. Risk Profiles (CH = 100 days limit)
    // ==========================================

    // A. Exceeded Limit (>100%) -> 105 days
    const exceededEmail = 'demo_exceeded@remotedays.app';
    console.log(`Creating Exceeded Risk User (${exceededEmail})...`);
    const exceededId = await insertUser(exceededEmail, 'Exceeded', 'Limit', 'CH');
    const exceededDates = getDates(105);
    await insertEntries(exceededId, exceededDates);
    console.log(` - Added ${exceededDates.length} days.`);

    // B. Critical Risk (90-100%) -> 95 days
    const criticalEmail = 'demo_critical@remotedays.app';
    console.log(`Creating Critical Risk User (${criticalEmail})...`);
    const criticalId = await insertUser(criticalEmail, 'Critical', 'Risk', 'CH');
    const criticalDates = getDates(95);
    await insertEntries(criticalId, criticalDates);
    console.log(` - Added ${criticalDates.length} days.`);

    // C. High Risk (75-90%) -> 80 days
    const highEmail = 'demo_high@remotedays.app';
    console.log(`Creating High Risk User (${highEmail})...`);
    const highId = await insertUser(highEmail, 'High', 'Risk', 'CH');
    const highDates = getDates(80);
    await insertEntries(highId, highDates);
    console.log(` - Added ${highDates.length} days.`);

    // D. Moderate Risk (50-75%) -> 60 days
    const moderateEmail = 'demo_moderate@remotedays.app';
    console.log(`Creating Moderate Risk User (${moderateEmail})...`);
    const moderateId = await insertUser(moderateEmail, 'Moderate', 'Risk', 'CH');
    const moderateDates = getDates(60);
    await insertEntries(moderateId, moderateDates);
    console.log(` - Added ${moderateDates.length} days.`);

    // ==========================================
    // 3. Email Test Users
    // ==========================================

    const email1 = 'alwinaugustin@gmail.com';
    console.log(`Creating Email Test User 1 (${email1})...`);
    await insertUser(email1, 'Alwin', 'Augustin', 'FR'); // Keep existing/default country

    const email2 = 'alwinaugustine@gmail.com';
    console.log(`Creating Email Test User 2 (${email2})...`);
    await insertUser(email2, 'Alwin', 'Augustine', 'FR');

    console.log('Committing changes...');
    await client.query('COMMIT');
    console.log('Done!');
  } catch (err) {
    console.error('Seeding failed:', err);
    await client.query('ROLLBACK');
    process.exit(1);
  } finally {
    await client.release();
    await server.close();
  }
};

seedCustomDemo();
