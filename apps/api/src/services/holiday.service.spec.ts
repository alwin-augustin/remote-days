import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HolidayService } from './holiday.service';
import { IHolidayRepository } from '../repositories/holiday.repository';
import { AppError } from '../errors/app-error';

describe('HolidayService', () => {
    let holidayService: HolidayService;
    let holidayRepo: IHolidayRepository;

    beforeEach(() => {
        holidayRepo = {
            create: vi.fn(),
            findAll: vi.fn(),
            delete: vi.fn(),
            findByDate: vi.fn(),
        } as any;
        holidayService = new HolidayService(holidayRepo);
    });

    describe('addHoliday', () => {
        it('should add a holiday successfully', async () => {
            const date = '2025-01-01';
            const description = 'New Year';
            const mockHoliday = { id: 1, date: new Date(date), description, country_code: null };

            (holidayRepo.findByDate as any).mockResolvedValue(null);
            (holidayRepo.create as any).mockResolvedValue(mockHoliday);

            const result = await holidayService.addHoliday(date, description);
            expect(result).toEqual(mockHoliday);
            expect(holidayRepo.create).toHaveBeenCalledWith(date, description, undefined);
        });

        it('should throw error if holiday exists', async () => {
            (holidayRepo.findByDate as any).mockResolvedValue({ id: 1 });
            await expect(holidayService.addHoliday('2025-01-01', 'Test'))
                .rejects.toThrow(AppError);
        });

        it('should throw error if date is invalid', async () => {
            // Service checks !date
            await expect(holidayService.addHoliday('', 'Test'))
                .rejects.toThrow(AppError);
        });
    });

    describe('getHolidays', () => {
        it('should return holidays', async () => {
            const mockHolidays = [{ id: 1, date: new Date('2025-01-01'), description: 'NY' }];
            (holidayRepo.findAll as any).mockResolvedValue(mockHolidays);

            const result = await holidayService.getHolidays(2025);
            expect(result).toEqual(mockHolidays);
            expect(holidayRepo.findAll).toHaveBeenCalledWith(2025, undefined);
        });
    });

    describe('isHoliday', () => {
        it('should return true if holiday exists for country', async () => {
            (holidayRepo.findByDate as any).mockResolvedValue({ id: 1 });
            const result = await holidayService.isHoliday('2025-01-01', 'FR');
            expect(result).toBe(true);
            expect(holidayRepo.findByDate).toHaveBeenCalledWith('2025-01-01', 'FR');
        });

        it('should return false if no holiday', async () => {
            (holidayRepo.findByDate as any).mockResolvedValue(null);
            const result = await holidayService.isHoliday('2025-01-02', 'FR');
            expect(result).toBe(false);
        });
    });
});
