import { Pool } from 'pg';
import { Holiday } from '@remotedays/types';

export interface IHolidayRepository {
  create(date: string, description: string, country_code?: string): Promise<Holiday>;
  delete(id: number): Promise<void>;
  findAll(year?: number, country_code?: string): Promise<Holiday[]>;
  findByDate(date: string, country_code?: string): Promise<Holiday | null>;
}

export class HolidayRepository implements IHolidayRepository {
  constructor(private pool: Pool) {}

  async create(date: string, description: string, country_code?: string): Promise<Holiday> {
    const { rows } = await this.pool.query<Holiday>(
      `INSERT INTO holidays (date, description, country_code)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [date, description, country_code || null]
    );
    return rows[0];
  }

  async delete(id: number): Promise<void> {
    await this.pool.query('DELETE FROM holidays WHERE id = $1', [id]);
  }

  async findAll(year?: number, country_code?: string): Promise<Holiday[]> {
    let query = 'SELECT * FROM holidays WHERE 1=1';
    const params: any[] = [];

    if (year) {
      params.push(year);
      // extracting year from date
      query += ` AND EXTRACT(YEAR FROM date) = $${params.length}`;
    }

    if (country_code) {
      params.push(country_code);
      // Holidays are applicable if they match specific country OR are global (null)
      query += ` AND (country_code = $${params.length} OR country_code IS NULL)`;
    }

    query += ' ORDER BY date ASC';

    const { rows } = await this.pool.query<Holiday>(query, params);
    return rows;
  }

  async findByDate(date: string, country_code?: string): Promise<Holiday | null> {
    const params: any[] = [date];
    let query = 'SELECT * FROM holidays WHERE date = $1';

    if (country_code) {
      params.push(country_code);
      query += ` AND (country_code = $2 OR country_code IS NULL)`;
    } else {
      // If checking global only
      query += ` AND country_code IS NULL`;
    }

    const { rows } = await this.pool.query<Holiday>(query, params);
    return rows[0] || null;
  }
}
