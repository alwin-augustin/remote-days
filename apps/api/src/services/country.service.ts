import { ICountryRepository, CountryThreshold } from '../repositories/country.repository';
import { AppError } from '../errors/app-error';

export class CountryService {
  constructor(private countryRepo: ICountryRepository) {}

  async getAllCountries(): Promise<CountryThreshold[]> {
    return this.countryRepo.findAll();
  }

  async addCountry(code: string, maxRemoteDays: number): Promise<CountryThreshold> {
    // Basic validation
    if (!/^[A-Z]{2}$/.test(code)) {
      throw new AppError('Invalid country code. Must be 2 uppercase letters (ISO).', 400);
    }
    if (maxRemoteDays < 0) {
      throw new AppError('Max remote days cannot be negative.', 400);
    }

    return this.countryRepo.create({ country_code: code, max_remote_days: maxRemoteDays });
  }

  async updateThreshold(code: string, maxRemoteDays: number): Promise<CountryThreshold | null> {
    if (maxRemoteDays < 0) {
      throw new AppError('Max remote days cannot be negative.', 400);
    }
    return this.countryRepo.update(code, maxRemoteDays);
  }
}
