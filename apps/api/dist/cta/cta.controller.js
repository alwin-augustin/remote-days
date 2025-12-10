"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordStatusHandler = recordStatusHandler;
async function recordStatusHandler(request, reply) {
    const { token } = request.query;
    if (!token) {
        return reply.code(400).send({ message: 'Token is required' });
    }
    const { rows } = await request.server.pg.query("SELECT * FROM email_cta_tokens WHERE token = $1", [token]);
    const tokenData = rows[0];
    if (!tokenData) {
        return reply.code(400).send({ message: 'Invalid token' });
    }
    if (tokenData.action === 'password-reset') {
        return reply.code(400).send({ message: 'Invalid token type' });
    }
    if (tokenData.used) {
        return reply.code(400).send({ message: 'Token has already been used' });
    }
    if (new Date() > new Date(tokenData.expires_at)) {
        return reply.code(400).send({ message: 'Token has expired' });
    }
    // The DB trigger for audit logs needs this session variable set
    const client = await request.server.pg.connect();
    try {
        await client.query('BEGIN');
        await client.query('SET LOCAL app.actor_user_id = $1', [tokenData.user_id]);
        await client.query(`INSERT INTO entries (user_id, date, status, source)
       VALUES ($1, $2, $3, 'email_link')
       ON CONFLICT (user_id, date) DO UPDATE SET status = $3, source = 'email_link'`, [tokenData.user_id, tokenData.target_date, tokenData.action]);
        await client.query("UPDATE email_cta_tokens SET used = true WHERE token = $1", [token]);
        await client.query('COMMIT');
        reply.code(200).send({ message: 'Status recorded' });
    }
    catch (err) {
        await client.query('ROLLBACK');
        request.log.error(err, 'Error recording status');
        reply.code(500).send({ message: 'Error recording status' });
    }
    finally {
        client.release();
    }
}
