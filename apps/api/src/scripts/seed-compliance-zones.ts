import { faker } from '@faker-js/faker';
import * as bcrypt from 'bcrypt';
import db from '../db';
import * as dotenv from 'dotenv';
import fastify from 'fastify';
import { format, subDays, isWeekend, eachDayOfInterval, startOfYear, endOfDay } from 'date-fns';

dotenv.config({ path: '../../.env' });

const seedComplianceZones = async () => {
    const server = fastify();
    await server.register(db);
    await server.ready();

    const client = await server.pg.connect();
    const saltRounds = 10;

    try {
        console.log('Starting Compliance Zones Seeding...');
        await client.query('BEGIN');

        // 1. Seed Country Thresholds (CRITICAL for Dashboard visibility)
        console.log('Seeding country_thresholds...');
        await client.query(`
      INSERT INTO country_thresholds (country_code, max_remote_days)
      VALUES 
        ('FR', 34),
        ('BE', 34),
        ('DE', 34),
        ('ES', 30)
      ON CONFLICT (country_code) 
      DO UPDATE SET max_remote_days = EXCLUDED.max_remote_days;
    `);

        // 2. Prepare common data
        const passwordHash = await bcrypt.hash('password123', saltRounds);
        const currentYear = new Date().getFullYear();
        const startOfCurrentYear = startOfYear(new Date());

        // Helper to insert user
        const insertUser = async (email: string, first: string, last: string) => {
            const res = await client.query(
                `INSERT INTO users (email, first_name, last_name, country_of_residence, work_country, password_hash, role, is_active)
             VALUES ($1, $2, $3, 'FR', 'FR', $4, 'employee', true)
             ON CONFLICT (email) DO UPDATE SET is_active = true, work_country = 'FR' RETURNING user_id`,
                [email, first, last, passwordHash]
            );
            return res.rows[0].user_id;
        };

        // Helper to generate dates (skipping weekends)
        const getWeekdays = (count: number): string[] => {
            const dates: string[] = [];
            let dayCursor = new Date();
            // Start from yesterday to avoid 'future' confusion if strict, but dashboard allows future. 
            // Let's stick to past/current for safety.

            // If we need 40 days, and we are early in the year, this might trigger "future" dates if we just go forward.
            // Let's go BACKWARDS from today.

            while (dates.length < count) {
                if (!isWeekend(dayCursor)) {
                    dates.push(format(dayCursor, 'yyyy-MM-dd'));
                }
                dayCursor = subDays(dayCursor, 1);

                // Safety break if we go back too far (e.g. into previous year)
                // Ideally we should stay in current year for the dashboard logic which checks "current year"
                if (dayCursor.getFullYear() < currentYear) {
                    console.warn(`Warning: generating dates went back to ${dayCursor.getFullYear()}. Dashboard filters by current year!`);
                    break;
                }
            }
            return dates;
        };

        // Helper to insert entries
        const insertEntries = async (userId: string, dates: string[], status: string) => {
            for (const date of dates) {
                await client.query(
                    `INSERT INTO entries (user_id, date, status, source)
                 VALUES ($1, $2, $3, 'seed_compliance')
                 ON CONFLICT (user_id, date) 
                 DO UPDATE SET status = $3, source = 'seed_compliance'`,
                    [userId, date, status]
                );
            }
        };

        // ---------------------------------------------------------
        // 3. Danger Zone User (> 100% of 34 days = 35+ days)
        // ---------------------------------------------------------
        const dangerEmail = 'danger_zone@tracker.com';
        console.log(`Creating Danger Zone user: ${dangerEmail}`);
        const dangerId = await insertUser(dangerEmail, 'Danger', 'Zone');

        // We need 40 days to be safe (pun intended) inside danger zone
        const dangerDates = getWeekdays(40);
        await insertEntries(dangerId, dangerDates, 'home');
        console.log(` - Added ${dangerDates.length} home entries for Danger User.`);


        // ---------------------------------------------------------
        // 4. Warning Zone User (75% - 99% of 34 days = 26 - 33 days)
        // ---------------------------------------------------------
        // Target: 28 days (~82%)
        const warningEmail = 'warning_zone@tracker.com';
        console.log(`Creating Warning Zone user: ${warningEmail}`);
        const warningId = await insertUser(warningEmail, 'Warning', 'Zone');

        const warningDates = getWeekdays(28);
        await insertEntries(warningId, warningDates, 'home');
        console.log(` - Added ${warningDates.length} home entries for Warning User.`);


        // ---------------------------------------------------------
        // 5. Safe Zone User (Low usage)
        // ---------------------------------------------------------
        const safeEmail = 'safe_zone@tracker.com';
        console.log(`Creating Safe Zone user: ${safeEmail}`);
        const safeId = await insertUser(safeEmail, 'Safe', 'Zone');

        const safeDates = getWeekdays(10);
        await insertEntries(safeId, safeDates, 'home');
        console.log(` - Added ${safeDates.length} home entries for Safe User.`);

        await client.query('COMMIT');
        console.log('Compliance Zone Seeding Completed Successfully!');

    } catch (err) {
        console.error('Seeding failed:', err);
        await client.query('ROLLBACK');
        process.exit(1);
    } finally {
        client.release();
        server.pg.pool.end();
    }
};

seedComplianceZones();
