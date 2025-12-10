import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CountryService } from '../country.service';
import { ICountryRepository } from '../../repositories/country.repository';
import { AppError } from '../../errors/app-error';

describe('CountryService', () => {
    let countryService: CountryService;
    let mockCountryRepo: ICountryRepository;

    beforeEach(() => {
        mockCountryRepo = {
            findAll: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
        } as any;
        countryService = new CountryService(mockCountryRepo);
    });

    it('should add valid country', async () => {
        const mockCountry = { country_code: 'US', max_remote_days: 10 };
        mockCountryRepo.create = vi.fn().mockResolvedValue(mockCountry);

        const result = await countryService.addCountry('US', 10);
        expect(result).toEqual(mockCountry);
    });

    it('should throw error for invalid country code', async () => {
        await expect(countryService.addCountry('USA', 10)).rejects.toThrow(AppError);
        await expect(countryService.addCountry('uS', 10)).rejects.toThrow(AppError);
    });

    it('should throw error for negative days', async () => {
        await expect(countryService.addCountry('US', -1)).rejects.toThrow(AppError);
    });
});
