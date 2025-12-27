import { IEntryRepository } from '../repositories/entry.repository';
import { work_status, Entry, EmployeeStats } from '@remotedays/types';
import { AppError } from '../errors/app-error';
import { config } from '../config/env';

import { IAuditRepository } from '../repositories/audit.repository';

export class EntryService {
  constructor(
    private entryRepo: IEntryRepository,
    private auditRepo: IAuditRepository
  ) { }

  async createOrUpdateEntry(
    userId: string,
    date: string,
    status: work_status,
    actorRole: string = 'employee',
    actorId: string
  ): Promise<Entry> {
    // 1. Check if an entry already exists for this user/date
    const existingEntry = await this.entryRepo.findByUserAndDate(userId, date);

    // 2. If exists, check permissions
    if (existingEntry) {
      // If user is trying to overwrite their own entry and is NOT admin/hr
      if (userId === actorId && !['admin', 'hr'].includes(actorRole)) {
        throw new AppError('You have already declared your status for this day.', 409);
      }
      // If Admin/HR is overwriting, or user is allowed (logic above covers restriction), proceed.
    }

    return this.entryRepo.upsert(userId, date, status, 'web');
  }

  async overrideEntry(
    targetUserId: string,
    date: string,
    status: work_status,
    reason: string,
    actorId: string,
    actorRole: string
  ): Promise<Entry> {
    if (!reason || reason.trim().length === 0) {
      throw new AppError('Reason is required for overriding an entry.', 400);
    }

    if (!['hr', 'admin'].includes(actorRole)) {
      throw new AppError('Only HR and Admin can override entries.', 403);
    }

    const previousEntry = await this.entryRepo.findByUserAndDate(targetUserId, date);
    const previousStatus = previousEntry ? previousEntry.status : 'none';

    // Upsert the entry (actorId is passed to set session variable if supported, but here acts as identity)
    const result = await this.entryRepo.upsert(targetUserId, date, status, 'web', actorId);

    // Log to Audit
    await this.auditRepo.log(
      'OVERRIDE',
      actorId,
      targetUserId,
      reason,
      'entry',
      result.id || 'unknown',
      undefined,
      undefined,
      undefined, // Actor details (optional if joined later)
      undefined,
      undefined,
      undefined, // Target details (optional if joined later)
      {
        date,
        previous_status: previousStatus,
        new_status: status,
      }
    );

    return result;
  }

  async getEntries(
    userId: string,
    params: { year?: string; month?: string; limit?: number; offset?: number }
  ): Promise<Entry[]> {
    if (params.year && params.month) {
      return this.entryRepo.findByUserAndMonth(userId, params.year, params.month);
    }
    return this.entryRepo.findAllByUser(userId, params.limit || 10, params.offset || 0);
  }

  async getUserStats(userId: string): Promise<EmployeeStats> {
    const currentYear = new Date().getFullYear();
    const stats = await this.entryRepo.getStatsForYear(userId, currentYear);

    const homeCount = parseInt(stats.home_days, 10) || 0;

    return {
      remoteDaysCount: homeCount,
      remoteDaysLimit: config.MAX_HOME_DAYS,
      complianceStatus: 'safe', // Logic to determine this can be added if shared utils are available, otherwise default safely
      daysRemaining: Math.max(0, config.MAX_HOME_DAYS - homeCount),
      percentageUsed: Math.min(100, Math.round((homeCount / config.MAX_HOME_DAYS) * 100)),
    };
  }
}
