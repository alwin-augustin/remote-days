import { IHolidayRepository } from '../repositories/holiday.repository';
import { Holiday } from '@remotedays/types';
import { AppError } from '../errors/app-error';

export class HolidayService {
  constructor(private holidayRepo: IHolidayRepository) {}

  async addHoliday(date: string, description: string, country_code?: string): Promise<Holiday> {
    if (!date) throw new AppError('Date is required', 400);
    if (!description) throw new AppError('Description is required', 400);

    // Check if exists
    const existing = await this.holidayRepo.findByDate(date, country_code);
    if (existing) {
      throw new AppError('A holiday already exists for this date and country scope', 409);
    }

    return this.holidayRepo.create(date, description, country_code);
  }

  async deleteHoliday(id: number): Promise<void> {
    return this.holidayRepo.delete(id);
  }

  async getHolidays(year?: number, country_code?: string): Promise<Holiday[]> {
    return this.holidayRepo.findAll(year, country_code);
  }

  async isHoliday(date: string, country_code: string): Promise<boolean> {
    const holiday = await this.holidayRepo.findByDate(date, country_code);
    return !!holiday;
  }
}
