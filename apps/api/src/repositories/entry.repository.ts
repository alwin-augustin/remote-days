import { Pool } from 'pg';
import { work_status } from '@remotedays/types';

export interface Entry {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD or Date object
  status: work_status;
  source: string;
  created_at: Date;
  updated_at: Date;
}

export interface IEntryRepository {
  upsert(userId: string, date: string, status: work_status, source: string, actorId?: string): Promise<Entry>;
  findByUserAndDate(userId: string, date: string): Promise<Entry | undefined>;
  findByUserAndMonth(userId: string, year: number | string, month: number | string): Promise<Entry[]>;
  findAllByUser(userId: string, limit: number, offset: number): Promise<Entry[]>;
  getStatsForYear(userId: string, year: number | string): Promise<{ home_days: string; office_days: string; country_of_residence: string; max_remote_days: string }>;
}

export class EntryRepository implements IEntryRepository {
  constructor(private pool: Pool) { }

  async findAllByUser(userId: string, limit: number, offset: number): Promise<Entry[]> {
    const { rows } = await this.pool.query<Entry>(
      'SELECT * FROM entries WHERE user_id = $1 ORDER BY date DESC LIMIT $2 OFFSET $3',
      [userId, limit, offset]
    );
    return rows;
  }

  async upsert(userId: string, date: string, status: work_status, source: string, actorId?: string): Promise<Entry> {
    const client = await this.pool.connect();
    try {
      if (actorId) {
        await client.query('BEGIN');
        await client.query("SELECT set_config('app.actor_user_id', $1, true)", [actorId]);
      }

      const { rows } = await client.query<Entry>(
        `INSERT INTO entries (user_id, date, status, source)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, date) DO UPDATE SET status = $3, source = $4
         RETURNING *`,
        [userId, date, status, source]
      );

      if (actorId) {
        await client.query('COMMIT');
      }
      return rows[0];
    } catch (err) {
      if (actorId) {
        await client.query('ROLLBACK');
      }
      throw err;
    } finally {
      client.release();
    }
  }

  async findByUserAndDate(userId: string, date: string): Promise<Entry | undefined> {
    const { rows } = await this.pool.query<Entry>('SELECT * FROM entries WHERE user_id = $1 AND date = $2', [
      userId,
      date,
    ]);
    return rows[0];
  }

  async findByUserAndMonth(userId: string, year: number | string, month: number | string): Promise<Entry[]> {
    const { rows } = await this.pool.query<Entry>(
      `SELECT * FROM entries
       WHERE user_id = $1
       AND date_part('year', date) = $2
       AND date_part('month', date) = $3`,
      [userId, year, month]
    );
    return rows;
  }

  async getStatsForYear(userId: string, year: number | string) {
    const { rows } = await this.pool.query(
      `SELECT
         COUNT(e.id) FILTER (WHERE e.status = 'home') as home_days,
         COUNT(e.id) FILTER (WHERE e.status = 'office') as office_days,
         u.country_of_residence,
         COALESCE(ct.max_remote_days, 34) as max_remote_days
       FROM users u
       LEFT JOIN entries e ON u.user_id = e.user_id AND date_part('year', e.date) = $2
       LEFT JOIN country_thresholds ct ON u.country_of_residence = ct.country_code
       WHERE u.user_id = $1
       GROUP BY u.user_id, u.country_of_residence, ct.max_remote_days`,
      [userId, year]
    );
    return rows[0] || { home_days: '0', office_days: '0', country_of_residence: 'FR', max_remote_days: '34' };
  }
}
