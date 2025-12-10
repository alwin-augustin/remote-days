import { Pool } from 'pg';

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  entity_id: string;
  entity_type: string;
  details: any;
  created_at: Date;
  actor_email: string;
  actor_first_name: string;
  actor_last_name: string;
  target_email: string;
  target_first_name: string;
  target_last_name: string;
  reason: string;
  entry_date: string;
  previous_status: string;
  new_status: string;
}

export interface IAuditRepository {
  getAuditLogs(startDate?: string, endDate?: string, action?: string): Promise<AuditLog[]>;
  log(action: string, actorId: string, targetId: string, reason: string, entityType: string, entityId: string, actorEmail?: string, actorFirstName?: string, actorLastName?: string, targetEmail?: string, targetFirstName?: string, targetLastName?: string, details?: any): Promise<void>;
}

export class AuditRepository implements IAuditRepository {
  constructor(private pool: Pool) { }

  async log(action: string, actorId: string, targetId: string, reason: string, entityType: string, entityId: string, actorEmail?: string, actorFirstName?: string, actorLastName?: string, targetEmail?: string, targetFirstName?: string, targetLastName?: string, details?: any): Promise<void> {
    const query = `
      INSERT INTO audit_logs (
        actor_user_id, action, entry_id, details, reason
      ) VALUES ($1, $2, $3, $4, $5)
    `;

    // Construct details object merging passed details with other info
    const safeDetails = details || {};
    if (targetId) safeDetails.user_id = targetId;
    safeDetails.entity_type = entityType;
    if (entityType !== 'entry') safeDetails.entity_id = entityId;

    // If it's an entry, we can populate entry_id column if the schema supports it.
    // Schema has entry_id.
    let entryIdVal = null;
    if (entityType === 'entry') {
      entryIdVal = entityId;
    }

    await this.pool.query(query, [
      actorId, action, entryIdVal, safeDetails, reason
    ]);
  }

  async getAuditLogs(startDate?: string, endDate?: string, action?: string): Promise<AuditLog[]> {
    let query = `
      SELECT
        al.id,
        al.created_at,
        al.action,
        al.details,
        al.reason,
        COALESCE(u.email, 'System') as actor_email,
        u.first_name as actor_first_name,
        u.last_name as actor_last_name,
        COALESCE(target.email, 'N/A') as target_email,
        target.first_name as target_first_name,
        target.last_name as target_last_name,
        (al.details->>'date') as entry_date,
        (al.details->>'previous_status') as previous_status,
        (al.details->>'new_status') as new_status
      FROM audit_logs al
      LEFT JOIN users u ON al.actor_user_id = u.user_id
      LEFT JOIN users target ON (al.details->>'user_id')::uuid = target.user_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (startDate) {
      query += ` AND al.created_at >= $${paramIndex}::timestamp`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND al.created_at <= $${paramIndex}::timestamp`;
      params.push(`${endDate} 23:59:59`);
      paramIndex++;
    }

    if (action) {
      query += ` AND al.action = $${paramIndex}`;
      params.push(action);
      paramIndex++;
    }

    query += ` ORDER BY al.created_at DESC LIMIT 1000`;

    const { rows } = await this.pool.query<AuditLog>(query, params);
    return rows;
  }
}
