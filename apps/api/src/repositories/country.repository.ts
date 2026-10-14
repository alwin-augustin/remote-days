import { Pool } from 'pg';

export interface CountryThreshold {
  country_code: string;
  max_remote_days: number;
}

export interface ICountryRepository {
  findAll(): Promise<CountryThreshold[]>;
  findByCode(code: string): Promise<CountryThreshold | null>;
  create(country: CountryThreshold): Promise<CountryThreshold>;
  update(code: string, maxRemoteDays: number): Promise<CountryThreshold | null>;
  delete(code: string): Promise<boolean>;
}

export class CountryRepository implements ICountryRepository {
  constructor(private pool: Pool) {}

  async findAll(): Promise<CountryThreshold[]> {
    const { rows } = await this.pool.query<CountryThreshold>(
      'SELECT * FROM country_thresholds ORDER BY country_code ASC'
    );
    return rows;
  }

  async findByCode(code: string): Promise<CountryThreshold | null> {
    const { rows } = await this.pool.query<CountryThreshold>(
      'SELECT * FROM country_thresholds WHERE country_code = $1',
      [code]
    );
    return rows[0] || null;
  }

  async create(country: CountryThreshold): Promise<CountryThreshold> {
    const { rows } = await this.pool.query<CountryThreshold>(
      'INSERT INTO country_thresholds (country_code, max_remote_days) VALUES ($1, $2) RETURNING *',
      [country.country_code, country.max_remote_days]
    );
    return rows[0];
  }

  async update(code: string, maxRemoteDays: number): Promise<CountryThreshold | null> {
    const { rows } = await this.pool.query<CountryThreshold>(
      'UPDATE country_thresholds SET max_remote_days = $1 WHERE country_code = $2 RETURNING *',
      [maxRemoteDays, code]
    );
    return rows[0] || null;
  }

  async delete(code: string): Promise<boolean> {
    const { rowCount } = await this.pool.query(
      'DELETE FROM country_thresholds WHERE country_code = $1',
      [code]
    );
    return (rowCount ?? 0) > 0;
  }
}
