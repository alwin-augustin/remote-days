import { IEntryRepository, Entry } from '../repositories/entry.repository';
import { work_status, EmployeeStats } from '@remotedays/types';
import { AppError } from '../errors/app-error';

export class EntryService {
  constructor(private entryRepo: IEntryRepository) {}

  // allowOverwrite: true for HR/admin overrides (permission checked in route layer)
  async createOrUpdateEntry(
    userId: string,
    date: string,
    status: work_status,
    allowOverwrite: boolean,
    actorId: string
  ): Promise<Entry> {
    const existingEntry = await this.entryRepo.findByUserAndDate(userId, date);

    if (existingEntry && !allowOverwrite) {
      throw new AppError('You have already declared your status for this day.', 409);
    }

    return this.entryRepo.upsert(userId, date, status, 'web', actorId);
  }

  // Override by HR/admin — passes reason to DB trigger for audit log (no double-write)
  async overrideEntry(
    targetUserId: string,
    date: string,
    status: work_status,
    reason: string,
    actorId: string
  ): Promise<Entry> {
    if (!reason || reason.trim().length === 0) {
      throw new AppError('Reason is required for overriding an entry.', 400);
    }

    return this.entryRepo.upsert(targetUserId, date, status, 'hr_correction', actorId, reason);
  }

  // Override by HR/admin by entry ID — passes reason to DB trigger for audit log
  async overrideEntryById(
    id: string,
    status: work_status,
    reason: string,
    actorId: string
  ): Promise<Entry | undefined> {
    if (!reason || reason.trim().length === 0) {
      throw new AppError('Reason is required for overriding an entry.', 400);
    }
    return this.entryRepo.updateById(id, status, actorId, reason);
  }

  async getEntries(
    userId: string,
    params: { year?: string; month?: string; limit?: number; offset?: number }
  ): Promise<{ data: Entry[]; total: number; limit: number; offset: number }> {
    const limit = Math.min(params.limit || 20, 100);
    const offset = params.offset || 0;
    if (params.year && params.month) {
      const entries = await this.entryRepo.findByUserAndMonth(userId, params.year, params.month);
      return { data: entries, total: entries.length, limit, offset };
    }
    const { entries, total } = await this.entryRepo.findAllByUser(userId, limit, offset);
    return { data: entries, total, limit, offset };
  }

  async getUserStats(userId: string): Promise<EmployeeStats> {
    const currentYear = new Date().getFullYear();
    const stats = await this.entryRepo.getStatsForYear(userId, currentYear);

    const homeCount = parseInt(stats.home_days, 10) || 0;
    const maxDays = parseInt(stats.max_remote_days, 10) || 34;
    const percentageUsed = maxDays > 0 ? Math.min(100, Math.round((homeCount / maxDays) * 100)) : 0;

    // Determine compliance status based on percentage
    let complianceStatus: 'safe' | 'warning' | 'critical' | 'exceeded' = 'safe';
    if (homeCount > maxDays) {
      complianceStatus = 'exceeded';
    } else if (percentageUsed >= 90) {
      complianceStatus = 'critical';
    } else if (percentageUsed >= 75) {
      complianceStatus = 'warning';
    }

    return {
      remoteDaysCount: homeCount,
      remoteDaysLimit: maxDays,
      complianceStatus,
      daysRemaining: Math.max(0, maxDays - homeCount),
      percentageUsed,
    };
  }
}
