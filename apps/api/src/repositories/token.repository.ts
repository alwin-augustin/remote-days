import { Pool } from 'pg';

export interface Token {
    token: string;
    user_id: string;
    action: string;
    target_date?: string;
    created_at: Date;
    expires_at: Date;
    used: boolean;
}

export interface ITokenRepository {
    create(token: string, userId: string, action: string, expiresAt: Date, targetDate?: string): Promise<void>;
    findByTokenAndAction(token: string, action: string): Promise<Token | null>;
    findByToken(token: string): Promise<Token | null>;
    markAsUsed(token: string): Promise<void>;
}

export class TokenRepository implements ITokenRepository {
    constructor(private pool: Pool) { }

    async create(token: string, userId: string, action: string, expiresAt: Date, targetDate?: string): Promise<void> {
        await this.pool.query(
            "INSERT INTO email_cta_tokens (token, user_id, action, expires_at, target_date) VALUES ($1, $2, $3, $4, $5)",
            [token, userId, action, expiresAt, targetDate]
        );
    }

    async findByTokenAndAction(token: string, action: string): Promise<Token | null> {
        const { rows } = await this.pool.query<Token>(
            "SELECT * FROM email_cta_tokens WHERE token = $1 AND action = $2",
            [token, action]
        );
        return rows[0] || null;
    }

    async findByToken(token: string): Promise<Token | null> {
        const { rows } = await this.pool.query<Token>(
            "SELECT * FROM email_cta_tokens WHERE token = $1",
            [token]
        );
        return rows[0] || null;
    }

    async markAsUsed(token: string): Promise<void> {
        await this.pool.query(
            "UPDATE email_cta_tokens SET used = true WHERE token = $1",
            [token]
        );
    }
}
