"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEmployeeSummaryHandler = getEmployeeSummaryHandler;
exports.updateEntryHandler = updateEntryHandler;
async function getEmployeeSummaryHandler(request, reply) {
    try {
        const { rows: summaries } = await request.server.pg.query(`
      WITH user_days_used AS (
        SELECT
          u.user_id,
          u.first_name,
          u.last_name,
          u.country_of_residence,
          u.work_country,
          COALESCE(COUNT(e.id) FILTER (WHERE e.status = 'home' AND date_part('year', e.date) = date_part('year', CURRENT_DATE)), 0) AS days_used_current_year
        FROM users u
        LEFT JOIN entries e ON u.user_id = e.user_id
        WHERE u.is_active = true
        GROUP BY u.user_id
      )
      SELECT
        udu.*,
        ct.max_remote_days,
        (ct.max_remote_days - udu.days_used_current_year) AS days_remaining,
        (udu.days_used_current_year * 100.0 / ct.max_remote_days) AS percent_used,
        CASE
          WHEN (udu.days_used_current_year * 100.0 / ct.max_remote_days) >= 100 THEN 'red'
          WHEN (udu.days_used_current_year * 100.0 / ct.max_remote_days) >= 75 THEN 'orange'
          ELSE 'green'
        END AS traffic_light
      FROM user_days_used udu
      JOIN country_thresholds ct ON udu.work_country = ct.country_code
      ORDER BY udu.last_name, udu.first_name;
      `);
        reply.code(200).send(summaries);
    }
    catch (err) {
        request.log.error(err, 'Error getting employee summary');
        reply.code(500).send({ message: 'Error getting employee summary' });
    }
}
async function updateEntryHandler(request, reply) {
    const { id } = request.params;
    const { status, reason } = request.body;
    const hrUser = request.user;
    if (!status || !reason) {
        return reply.code(400).send({ message: 'Status and reason are required' });
    }
    // Basic validation for the status enum
    const validStatuses = ['home', 'office', 'travel', 'sick', 'unknown'];
    if (!validStatuses.includes(status)) {
        return reply.code(400).send({ message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }
    const client = await request.server.pg.connect();
    try {
        await client.query('BEGIN');
        await client.query('SET LOCAL app.actor_user_id = $1', [hrUser.user_id]);
        await client.query('SET LOCAL app.actor_reason = $1', [reason]);
        const { rows } = await client.query("UPDATE entries SET status = $1, source = 'hr_correction' WHERE id = $2 RETURNING *", [status, id]);
        await client.query('COMMIT');
        if (rows.length === 0) {
            return reply.code(404).send({ message: 'Entry not found' });
        }
        reply.code(200).send(rows[0]);
    }
    catch (err) {
        await client.query('ROLLBACK');
        // Check for constraint violation on status enum
        if (err.code === '22P02' && err.message.includes('work_status')) {
            return reply.code(400).send({ message: 'Invalid status value' });
        }
        request.log.error(err, 'Error updating entry');
        reply.code(500).send({ message: 'Error updating entry' });
    }
    finally {
        client.release();
    }
}
