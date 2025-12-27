import { Pool } from 'pg';
import { EntryRequest, RequestStatus } from '@remotedays/types';

export interface IRequestRepository {
    create(userId: string, date: string, status: string, reason: string): Promise<EntryRequest>;
    findById(id: string): Promise<EntryRequest | null>;
    findByUser(userId: string): Promise<EntryRequest[]>;
    findByStatus(status: RequestStatus): Promise<EntryRequest[]>;
    findAll(): Promise<EntryRequest[]>;
    updateStatus(id: string, status: RequestStatus, adminId: string, adminNote?: string): Promise<EntryRequest | null>;
}

export class RequestRepository implements IRequestRepository {
    constructor(private pool: Pool) { }

    async create(userId: string, date: string, status: string, reason: string): Promise<EntryRequest> {
        const { rows } = await this.pool.query<EntryRequest>(
            `INSERT INTO requests (user_id, date, requested_status, reason, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING *`,
            [userId, date, status, reason]
        );
        return rows[0];
    }

    async findById(id: string): Promise<EntryRequest | null> {
        const { rows } = await this.pool.query<EntryRequest>('SELECT * FROM requests WHERE id = $1', [id]);
        return rows[0] || null;
    }

    async findByUser(userId: string): Promise<EntryRequest[]> {
        const { rows } = await this.pool.query<EntryRequest>(
            'SELECT * FROM requests WHERE user_id = $1 ORDER BY created_at DESC',
            [userId]
        );
        return rows;
    }

    async findByStatus(status: RequestStatus): Promise<EntryRequest[]> {
        const { rows } = await this.pool.query<EntryRequest>(
            `SELECT r.*, u.email as user_email, u.first_name as user_first_name, u.last_name as user_last_name
             FROM requests r
             JOIN users u ON r.user_id = u.user_id
             WHERE r.status = $1 
             ORDER BY r.created_at ASC`,
            [status]
        );
        return rows;
    }

    async findAll(): Promise<EntryRequest[]> {
        const { rows } = await this.pool.query<EntryRequest>(
            `SELECT r.*, u.email as user_email, u.first_name as user_first_name, u.last_name as user_last_name
             FROM requests r
             JOIN users u ON r.user_id = u.user_id
             ORDER BY r.created_at DESC`
        );
        return rows;
    }

    async updateStatus(id: string, status: RequestStatus, adminId: string, adminNote?: string): Promise<EntryRequest | null> {
        const { rows } = await this.pool.query<EntryRequest>(
            `UPDATE requests 
       SET status = $1, admin_id = $2, admin_note = $3, updated_at = now()
       WHERE id = $4
       RETURNING *`,
            [status, adminId, adminNote, id]
        );
        return rows[0] || null;
    }
}
