import { Pool, QueryResult } from 'pg';
import { User } from '@tracker/types';

export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(user: Partial<User> & { password_hash: string }): Promise<User>;
  updatePassword(userId: string, newHash: string): Promise<void>;
  findAll(limit: number, offset: number, search?: string): Promise<{ users: User[]; total: number }>;
  update(id: string, updates: Partial<User>): Promise<User | null>;
  softDelete(id: string): Promise<void>;
}

export class UserRepository implements IUserRepository {
  constructor(private pool: Pool) { }

  async findByEmail(email: string): Promise<User | null> {
    const { rows } = await this.pool.query<User>(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return rows[0] || null;
  }

  async findById(id: string): Promise<User | null> {
    const { rows } = await this.pool.query<User>(
      'SELECT * FROM users WHERE user_id = $1',
      [id]
    );
    return rows[0] || null;
  }

  async create(user: Partial<User> & { password_hash: string }): Promise<User> {
    const {
      email,
      first_name,
      last_name,
      country_of_residence,
      work_country,
      password_hash,
      role,
    } = user;

    const { rows } = await this.pool.query<User>(
      `INSERT INTO users (
        email, first_name, last_name, country_of_residence, work_country, password_hash, role
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        email,
        first_name,
        last_name,
        country_of_residence,
        work_country,
        password_hash,
        role || 'employee',
      ]
    );
    return rows[0];
  }

  async updatePassword(userId: string, newHash: string): Promise<void> {
    await this.pool.query(
      'UPDATE users SET password_hash = $1 WHERE user_id = $2',
      [newHash, userId]
    );
  }

  async findAll(limit: number, offset: number, search?: string): Promise<{ users: User[]; total: number }> {
    let query = 'SELECT * FROM users WHERE is_active = true';
    const params: any[] = [];

    if (search) {
      query += ` AND (email ILIKE $1 OR first_name ILIKE $1 OR last_name ILIKE $1)`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const { rows } = await this.pool.query<User>(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM users WHERE is_active = true';
    const countParams: any[] = [];
    if (search) {
      countQuery += ` AND (email ILIKE $1 OR first_name ILIKE $1 OR last_name ILIKE $1)`;
      countParams.push(`%${search}%`);
    }
    const { rows: countRows } = await this.pool.query(countQuery, countParams);

    return { users: rows, total: parseInt(countRows[0].count, 10) };
  }

  async update(id: string, updates: Partial<User>): Promise<User | null> {
    const allowedFields = ['email', 'first_name', 'last_name', 'country_of_residence', 'work_country', 'role', 'is_active', 'slack_user_id', 'notification_method'];
    const fields = Object.keys(updates).filter(key => allowedFields.includes(key));

    if (fields.length === 0) return null;

    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    const values = fields.map(field => (updates as any)[field]);

    const { rows } = await this.pool.query<User>(
      `UPDATE users SET ${setClause} WHERE user_id = $1 RETURNING *`,
      [id, ...values]
    );
    return rows[0] || null;
  }

  async softDelete(id: string): Promise<void> {
    await this.pool.query('UPDATE users SET is_active = false WHERE user_id = $1', [id]);
  }
}
