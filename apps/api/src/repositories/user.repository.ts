import { Pool, QueryResult } from 'pg';
import { User } from '@remotedays/types';

export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(user: Partial<User> & { password_hash: string }): Promise<User>;
  createOrSkip(user: Partial<User> & { password_hash: string }): Promise<string | null>;
  updatePassword(userId: string, newHash: string): Promise<void>;
  findAll(
    limit: number,
    offset: number,
    search?: string,
    filters?: { role?: string; country?: string }
  ): Promise<{ users: User[]; total: number }>;
  update(id: string, updates: Partial<User>): Promise<User | null>;
  softDelete(id: string): Promise<void>;
}

export class UserRepository implements IUserRepository {
  constructor(private pool: Pool) {}

  async findByEmail(email: string): Promise<User | null> {
    const { rows } = await this.pool.query<User>('SELECT * FROM users WHERE email = $1 AND is_active = true', [email]);
    return rows[0] || null;
  }

  async findById(id: string): Promise<User | null> {
    const { rows } = await this.pool.query<User>('SELECT * FROM users WHERE user_id = $1 AND is_active = true', [id]);
    return rows[0] || null;
  }

  async create(user: Partial<User> & { password_hash: string }): Promise<User> {
    const { email, first_name, last_name, country_of_residence, work_country, password_hash, role } = user;

    const { rows } = await this.pool.query<User>(
      `INSERT INTO users (
        email, first_name, last_name, country_of_residence, work_country, password_hash, role
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [email, first_name, last_name, country_of_residence, work_country, password_hash, role || 'employee']
    );
    return rows[0];
  }

  async createOrSkip(user: Partial<User> & { password_hash: string }): Promise<string | null> {
    const { email, first_name, last_name, country_of_residence, work_country, password_hash, role } = user;

    const { rows } = await this.pool.query(
      `INSERT INTO users (
        email, first_name, last_name, country_of_residence, work_country, password_hash, role, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, true)
      ON CONFLICT (email) DO NOTHING
      RETURNING user_id`,
      [email, first_name, last_name, country_of_residence, work_country, password_hash, role || 'employee']
    );

    return rows.length > 0 ? rows[0].user_id : null;
  }

  async updatePassword(userId: string, newHash: string): Promise<void> {
    await this.pool.query('UPDATE users SET password_hash = $1 WHERE user_id = $2', [newHash, userId]);
  }

  async findAll(
    limit: number,
    offset: number,
    search?: string,
    filters?: { role?: string; country?: string }
  ): Promise<{ users: User[]; total: number }> {
    let query = 'SELECT * FROM users WHERE is_active = true';
    const params: (string | number)[] = [];

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (email ILIKE $${params.length} OR first_name ILIKE $${params.length} OR last_name ILIKE $${params.length})`;
    }

    if (filters?.role && filters.role !== 'all') {
      params.push(filters.role);
      query += ` AND role = $${params.length}`;
    }

    if (filters?.country && filters.country !== 'all') {
      params.push(filters.country);
      query += ` AND (work_country = $${params.length} OR country_of_residence = $${params.length})`;
    }

    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)');
    const { rows: countRows } = await this.pool.query<{ count: string }>(countQuery, params);

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    const paginatedParams = [...params, limit, offset];

    const { rows } = await this.pool.query<User>(query, paginatedParams);

    return { users: rows, total: parseInt(countRows[0].count, 10) };
  }

  async update(id: string, updates: Partial<User>): Promise<User | null> {
    const allowedFields: (keyof User)[] = [
      'email',
      'first_name',
      'last_name',
      'country_of_residence',
      'work_country',
      'role',
      'is_active',
    ];

    const fields = (Object.keys(updates) as (keyof User)[]).filter((key) => allowedFields.includes(key) && updates[key] !== undefined);

    if (fields.length === 0) return null;

    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    const values = fields.map((field) => updates[field]);

    const { rows } = await this.pool.query<User>(`UPDATE users SET ${setClause} WHERE user_id = $1 RETURNING *`, [
      id,
      ...values,
    ]);
    return rows[0] || null;
  }

  async softDelete(id: string): Promise<void> {
    await this.pool.query('UPDATE users SET is_active = false WHERE user_id = $1', [id]);
  }
}
