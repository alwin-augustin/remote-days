"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEntryHandler = createEntryHandler;
exports.getEntriesHandler = getEntriesHandler;
async function createEntryHandler(request, reply) {
    const { status, date } = request.body;
    const user = request.user;
    if (!status || !date) {
        return reply.code(400).send({ message: 'Status and date are required' });
    }
    try {
        const { rows } = await request.server.pg.query(`INSERT INTO entries (user_id, date, status, source)
       VALUES ($1, $2, $3, 'web')
       ON CONFLICT (user_id, date) DO UPDATE SET status = $3, source = 'web'
       RETURNING *`, [user.user_id, date, status]);
        reply.code(201).send(rows[0]);
    }
    catch (err) {
        request.log.error(err, 'Error creating entry');
        reply.code(500).send({ message: 'Error creating entry' });
    }
}
async function getEntriesHandler(request, reply) {
    const { year, month } = request.query;
    const user = request.user;
    if (!year || !month) {
        return reply.code(400).send({ message: 'Year and month are required' });
    }
    try {
        const { rows } = await request.server.pg.query(`SELECT * FROM entries
       WHERE user_id = $1
       AND date_part('year', date) = $2
       AND date_part('month', date) = $3`, [user.user_id, year, month]);
        reply.code(200).send(rows);
    }
    catch (err) {
        request.log.error(err, 'Error fetching entries');
        reply.code(500).send({ message: 'Error fetching entries' });
    }
}
