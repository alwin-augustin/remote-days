import { IHRRepository } from '../repositories/hr.repository';
import { work_status } from '@remotedays/types';

export class HRService {
  constructor(private hrRepo: IHRRepository) {}

  async getEmployeeSummaries() {
    return this.hrRepo.getEmployeeSummaries();
  }

  async getEmployeeEntries(year: string, month: string) {
    return this.hrRepo.getEmployeeEntries(year, month);
  }

  async updateEntry(id: string, status: work_status, reason: string, actorId: string) {
    return this.hrRepo.updateEntry(id, status, reason, actorId);
  }

  async getDailyStats(date: string) {
    return this.hrRepo.getDailyStats(date);
  }

  async getDailyEntries(date: string) {
    return this.hrRepo.getDailyEntries(date);
  }

  async getRiskStats(date: string) {
    return this.hrRepo.getRiskStats(date);
  }
}
