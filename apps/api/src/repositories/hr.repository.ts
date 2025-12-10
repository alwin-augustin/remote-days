import { Pool } from 'pg';
import { work_status } from '@tracker/types';

export interface EmployeeSummary {
  user_id: string;
  first_name: string;
  last_name: string;
  country_of_residence: string;
  work_country: string;
  days_used_current_year: number;
  max_remote_days: number;
  days_remaining: number;
  percent_used: number;
  traffic_light: 'red' | 'orange' | 'green';
}

export interface EmployeeEntry {
  id: string;
  user_id: string;
  date: string;
  status: work_status;
  source: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
}

export interface DailyStats {
  total_users: string;
  home: string;
  office: string;
  travel: string;
  sick: string;
  unknown: number;
}

export interface DailyEntry {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  country_of_residence: string;
  status: string;
  source: string | null;
  updated_at: string | null;
}

export interface IHRRepository {
  getEmployeeSummaries(): Promise<EmployeeSummary[]>;
  getEmployeeEntries(year: string, month: string): Promise<EmployeeEntry[]>;
  updateEntry(id: string, status: work_status, reason: string, actorId: string): Promise<any>;
  getDailyStats(date: string): Promise<DailyStats>;
  getDailyEntries(date: string): Promise<DailyEntry[]>;
}

export class HRRepository implements IHRRepository {
  constructor(private pool: Pool) { }

  async getEmployeeSummaries(): Promise<EmployeeSummary[]> {
    const { rows } = await this.pool.query<EmployeeSummary>(
      `
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
        ORDER BY u.last_name, u.first_name
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
      `
    );
    return rows;
  }

  async getEmployeeEntries(year: string, month: string): Promise<EmployeeEntry[]> {
    const { rows } = await this.pool.query<EmployeeEntry>(
      `SELECT
        e.id, e.user_id, e.date, e.status, e.source,
        u.first_name, u.last_name, u.email, u.role
       FROM entries e
       JOIN users u ON e.user_id = u.user_id
       WHERE date_part('year', e.date) = $1
       AND date_part('month', e.date) = $2
       ORDER BY e.date, u.last_name, u.first_name;`,
      [year, month]
    );
    return rows;
  }

  async updateEntry(id: string, status: work_status, reason: string, actorId: string): Promise<any> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.actor_user_id', $1, true)", [actorId]);
      await client.query("SELECT set_config('app.actor_reason', $1, true)", [reason]);

      const { rows } = await client.query(
        "UPDATE entries SET status = $1, source = 'hr_correction' WHERE id = $2 RETURNING *",
        [status, id]
      );

      await client.query('COMMIT');
      return rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getDailyStats(date: string): Promise<DailyStats> {
    const { rows } = await this.pool.query(
      `SELECT
        (SELECT COUNT(*) FROM users WHERE is_active = true) as total_users,
        COUNT(*) FILTER (WHERE status = 'home') as home,
        COUNT(*) FILTER (WHERE status = 'office') as office,
        COUNT(*) FILTER (WHERE status = 'travel') as travel,
        COUNT(*) FILTER (WHERE status = 'sick') as sick
       FROM entries
       WHERE date = $1`,
      [date]
    );
    const stats = rows[0];
    // Calculate unknown (pending)
    const reported = parseInt(stats.home) + parseInt(stats.office) + parseInt(stats.travel) + parseInt(stats.sick);
    const unknown = parseInt(stats.total_users) - reported;

    return {
      ...stats,
      unknown: unknown < 0 ? 0 : unknown // Safety net
    };
  }

  async getDailyEntries(date: string): Promise<DailyEntry[]> {
    const { rows } = await this.pool.query<DailyEntry>(
      `SELECT
        u.user_id,
        u.first_name,
        u.last_name,
        u.email,
        u.country_of_residence,
        COALESCE(e.status, 'unknown') as status,
        e.source,
        e.updated_at
       FROM users u
       LEFT JOIN entries e ON u.user_id = e.user_id AND e.date = $1
       WHERE u.is_active = true
       ORDER BY u.last_name, u.first_name`,
      [date]
    );
    return rows;
  }
}
