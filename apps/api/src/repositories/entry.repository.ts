import { Pool } from 'pg';
import { work_status } from '@tracker/types';

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
  getStatsForYear(userId: string, year: number | string): Promise<{ home_days: string; office_days: string }>;
}

export class EntryRepository implements IEntryRepository {
  constructor(private pool: Pool) { }

  async upsert(
    userId: string,
    date: string,
    status: work_status,
    source: string,
    actorId?: string
  ): Promise<Entry> {
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
    const { rows } = await this.pool.query<Entry>(
      'SELECT * FROM entries WHERE user_id = $1 AND date = $2',
      [userId, date]
    );
    return rows[0];
  }

  async findByUserAndMonth(
    userId: string,
    year: number | string,
    month: number | string
  ): Promise<Entry[]> {
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
         COUNT(*) FILTER (WHERE status = 'home') as home_days,
         COUNT(*) FILTER (WHERE status = 'office') as office_days
       FROM entries
       WHERE user_id = $1
       AND date_part('year', date) = $2`,
      [userId, year]
    );
    return rows[0];
  }
}
