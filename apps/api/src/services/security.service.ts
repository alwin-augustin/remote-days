/**
 * Security Service
 * Handles login attempt tracking, account lockout, and security event logging
 */

import { FastifyInstance } from 'fastify';

export interface LoginAttempt {
  id: string;
  email: string;
  ip_address: string;
  user_agent: string;
  success: boolean;
  failure_reason?: string;
  created_at: Date;
}

export interface SecurityEvent {
  id: string;
  event_type: string;
  user_id?: string;
  email?: string;
  ip_address: string;
  user_agent: string;
  details: Record<string, unknown>;
  created_at: Date;
}

// Configuration
const LOCKOUT_THRESHOLD = 5; // Failed attempts before lockout
const LOCKOUT_DURATION_MINUTES = 15; // Lockout duration
const ATTEMPT_WINDOW_MINUTES = 15; // Time window for counting attempts

export class SecurityService {
  constructor(private readonly fastify: FastifyInstance) {}

  /**
   * Record a login attempt
   */
  async recordLoginAttempt(
    email: string,
    ipAddress: string,
    userAgent: string,
    success: boolean,
    failureReason?: string
  ): Promise<void> {
    try {
      await this.fastify.pg.query(
        `INSERT INTO login_attempts (email, ip_address, user_agent, success, failure_reason)
         VALUES ($1, $2, $3, $4, $5)`,
        [email, ipAddress, userAgent || 'unknown', success, failureReason]
      );
    } catch (error) {
      // Log but don't fail the request
      this.fastify.log.error({ error, email }, 'Failed to record login attempt');
    }
  }

  /**
   * Check if an account is locked out
   */
  async isAccountLocked(email: string): Promise<{ locked: boolean; remainingMinutes: number }> {
    try {
      const result = await this.fastify.pg.query<{ attempt_count: string; oldest_attempt: Date }>(
        `SELECT
           COUNT(*) as attempt_count,
           MIN(created_at) as oldest_attempt
         FROM login_attempts
         WHERE email = $1
           AND success = false
           AND created_at > NOW() - INTERVAL '${ATTEMPT_WINDOW_MINUTES} minutes'`,
        [email]
      );

      const attemptCount = parseInt(result.rows[0]?.attempt_count || '0', 10);

      if (attemptCount >= LOCKOUT_THRESHOLD) {
        // Calculate remaining lockout time
        const oldestAttempt = result.rows[0]?.oldest_attempt;
        if (oldestAttempt) {
          const lockoutEnd = new Date(oldestAttempt.getTime() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
          const now = new Date();
          const remainingMs = lockoutEnd.getTime() - now.getTime();
          const remainingMinutes = Math.max(0, Math.ceil(remainingMs / 60000));

          if (remainingMinutes > 0) {
            return { locked: true, remainingMinutes };
          }
        }
      }

      return { locked: false, remainingMinutes: 0 };
    } catch (error) {
      this.fastify.log.error({ error, email }, 'Failed to check account lockout');
      return { locked: false, remainingMinutes: 0 };
    }
  }

  /**
   * Get failed attempt count for an email
   */
  async getFailedAttemptCount(email: string): Promise<number> {
    try {
      const result = await this.fastify.pg.query<{ count: string }>(
        `SELECT COUNT(*) as count
         FROM login_attempts
         WHERE email = $1
           AND success = false
           AND created_at > NOW() - INTERVAL '${ATTEMPT_WINDOW_MINUTES} minutes'`,
        [email]
      );
      return parseInt(result.rows[0]?.count || '0', 10);
    } catch (error) {
      this.fastify.log.error({ error, email }, 'Failed to get failed attempt count');
      return 0;
    }
  }

  /**
   * Clear login attempts after successful login
   */
  async clearLoginAttempts(email: string): Promise<void> {
    try {
      await this.fastify.pg.query(
        `DELETE FROM login_attempts WHERE email = $1`,
        [email]
      );
    } catch (error) {
      this.fastify.log.error({ error, email }, 'Failed to clear login attempts');
    }
  }

  /**
   * Log a security event
   */
  async logSecurityEvent(
    eventType: string,
    ipAddress: string,
    userAgent: string,
    details: Record<string, unknown> = {},
    userId?: string,
    email?: string
  ): Promise<void> {
    try {
      await this.fastify.pg.query(
        `INSERT INTO security_events (event_type, user_id, email, ip_address, user_agent, details)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [eventType, userId, email, ipAddress, userAgent || 'unknown', JSON.stringify(details)]
      );
    } catch (error) {
      this.fastify.log.error({ error, eventType }, 'Failed to log security event');
    }
  }

  /**
   * Get recent security events for admin dashboard
   */
  async getSecurityEvents(limit = 100, offset = 0): Promise<SecurityEvent[]> {
    const result = await this.fastify.pg.query<SecurityEvent>(
      `SELECT * FROM security_events
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows;
  }

  /**
   * Get login attempts for a specific email (for admin investigation)
   */
  async getLoginAttempts(email: string, limit = 50): Promise<LoginAttempt[]> {
    const result = await this.fastify.pg.query<LoginAttempt>(
      `SELECT * FROM login_attempts
       WHERE email = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [email, limit]
    );
    return result.rows;
  }
}

// Security event types
export const SecurityEventTypes = {
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGIN_LOCKOUT: 'LOGIN_LOCKOUT',
  PASSWORD_RESET_REQUEST: 'PASSWORD_RESET_REQUEST',
  PASSWORD_RESET_SUCCESS: 'PASSWORD_RESET_SUCCESS',
  ACCOUNT_DELETED: 'ACCOUNT_DELETED',
  DATA_EXPORTED: 'DATA_EXPORTED',
  UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
} as const;
