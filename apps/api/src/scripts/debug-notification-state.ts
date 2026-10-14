import * as dotenv from 'dotenv';
import fastify from 'fastify';
import db from '../db';
import { format } from 'date-fns';

dotenv.config({ path: '../../.env' });

const debugNotifications = async () => {
    const server = fastify();
    await server.register(db);
    await server.ready();

    const client = await server.pg.connect();

    try {
        const today = format(new Date(), 'yyyy-MM-dd');
        console.log(`\n=== Debugging Notifications for ${today} ===\n`);

        // 1. Check for Holidays
        const holidayRes = await client.query('SELECT * FROM holidays WHERE date = $1', [today]);
        if (holidayRes.rows.length > 0) {
            console.log('❌ HOLIDAY DETECTED!');
            console.table(holidayRes.rows);
        } else {
            console.log('✅ No holiday found for today.');
        }

        // 2. Check Active Users
        const activeUsersRes = await client.query('SELECT count(*) FROM users WHERE is_active = true');
        console.log(`\nℹ️  Total Active Users: ${activeUsersRes.rows[0].count}`);

        // 3. Check Entries for Today
        const entriesRes = await client.query('SELECT count(*) FROM entries WHERE date = $1', [today]);
        console.log(`ℹ️  Entries for today: ${entriesRes.rows[0].count}`);

        // 4. Check Pending Users (Active - Entries)
        const pendingRes = await client.query(`
        SELECT u.user_id, u.email, u.first_name 
        FROM users u
        WHERE u.is_active = true 
        AND NOT EXISTS (SELECT 1 FROM entries e WHERE e.user_id = u.user_id AND e.date = $1)
        LIMIT 5;
    `, [today]);

        console.log(`\nℹ️  Pending Users (Sample 5): ${pendingRes.rows.length}`);
        if (pendingRes.rows.length > 0) {
            console.table(pendingRes.rows.map(r => ({ email: r.email, id: r.user_id })));
        } else {
            console.log('⚠️  NO PENDING USERS FOUND! Everyone has an entry or is inactive.');
        }

        // 5. Delete Entries if requested (for testing)
        // We will delete entries for 5 random users to make them pending
        console.log('\n=== Action: Deleting entries for 5 users to make them pending ===');
        const resetRes = await client.query(`
        DELETE FROM entries 
        WHERE user_id IN (
            SELECT user_id FROM entries WHERE date = $1 LIMIT 5
        ) AND date = $1
        RETURNING user_id;
    `, [today]);

        console.log(`✅ Deleted entries for ${resetRes.rows.length} users.`);
        console.log('They should now receive notifications.');

    } catch (err) {
        console.error('Debug script failed:', err);
    } finally {
        client.release();
        server.pg.pool.end();
    }
};

debugNotifications();
