import * as dotenv from 'dotenv';
import fastify from 'fastify';
import db from '../db';
import { format, utcToZonedTime } from 'date-fns-tz';
import { sendEmailPrompts } from '../worker/worker';
import { emailService } from '../services/email.service';

dotenv.config({ path: '../../.env' });

// Mock Fastify Instance
const mockFastify: any = {
    log: {
        info: (msg: string) => console.log('INFO:', msg),
        error: (err: any, msg: string) => console.error('ERROR:', msg, err),
    },
    pg: undefined // Will be set after connection
};

const runManualTrigger = async () => {
    const server = fastify();
    await server.register(db);
    await server.ready();

    mockFastify.pg = server.pg;

    console.log('--- Starting Manual Trigger Debug ---');
    try {
        // Run the worker logic directly
        const result = await sendEmailPrompts(mockFastify, { onlyPending: true }, (progress) => {
            console.log(`Progress: ${progress.percent}% (Sent: ${progress.sent}, Skipped: ${progress.skipped})`);
        });

        console.log('--- Result ---');
        console.log(result);

    } catch (err) {
        console.error('Manual Trigger Critical Error:', err);
    } finally {
        server.pg.pool.end();
    }
};

runManualTrigger();
